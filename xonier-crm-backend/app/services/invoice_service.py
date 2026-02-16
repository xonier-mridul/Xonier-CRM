from typing import Dict, Any
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from app.utils.custom_exception import AppException
from app.repositories.invoice_repository import InvoiceRepository
from beanie import PydanticObjectId
from app.core.constants import SUPER_ADMIN_CODE
from app.utils.get_team_members import GetTeamMembers
from app.utils.validate_admin import validate_admin
from app.core.crypto import Encryption
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime

class InvoiceService:
    def __init__(self):
        self.repo = InvoiceRepository()
        self.getTeamMem = GetTeamMembers()
        self.encryption = Encryption()

    async def getAll(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page") or 1)
            limit = int(filters.get("limit") or 10)

            query = {}


            is_super_admin = False

            for role in user.get("userRole", []):
                if role.get("code") == SUPER_ADMIN_CODE:
                    is_super_admin = True
                    break

            if not is_super_admin:

                members = await self.getTeamMem.get_team_members(user["_id"])

                if members:
                    query.update({
                        "createdBy.$id": {
                            "$in": [PydanticObjectId(m) for m in members]
                        }
                    })
                else:
                    
                    query.update({
                        "createdBy.$id": PydanticObjectId(user["_id"])
                    })

            if "invoiceId" in filters:
                query.update({"invoiceId": filters["invoiceId"]})

            if "status" in filters:
                query.update({"status": filters["status"]})

            if "dealId" in filters:
                query.update({"deal": PydanticObjectId(filters["dealId"])})

            if "createdBy" in filters and is_super_admin:
                query.update({
                    "createdBy.$id": PydanticObjectId(filters["createdBy"])
                })

            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy", "deal_id", "updatedBy"],
            )

            if not result:
                raise AppException(404, "Invoice data not found")

            result = jsonable_encoder(
                result,
                exclude={
                    "createdBy": {"password"},
                    "updatedBy": {"password"},
                },
            )



            return result

        except AppException:
            raise

        except Exception as e:
            print("Invoice getAll error:", e)
            raise AppException(
                status_code=500,
                message="Internal server error"
            )


    async def get_by_id(self, id: str, user: Dict[str, Any]):
            try:
                invoice_id = PydanticObjectId(id)

                is_super_admin = validate_admin(user.get("userRole", []))


                access_query = {"_id": invoice_id}

                if not is_super_admin:
                    members = await self.getTeamMem.get_team_members(user["_id"])

                    allowed_user_ids = []

                    if members:
                        allowed_user_ids.extend(
                            [PydanticObjectId(m) for m in members]
                        )

                    allowed_user_ids.append(PydanticObjectId(user["_id"]))

                    access_query.update({
                        "createdBy.$id": {"$in": allowed_user_ids}
                    })


                invoice = await self.repo.find_one(
                    filter=access_query,
                    populate=["createdBy", "updatedBy", "deal", "quotation"],
                )

                if not invoice:
                    raise AppException(
                        403,
                        "You are not authorized to access this invoice or it does not exist"
                    )


                invoice = jsonable_encoder(
                    invoice,
                    exclude={
                        "createdBy": {"password"},
                        "updatedBy": {"password"},
                    },
                )

                # print("invoice: ", invoice["customerEmail"])

                invoice["customerEmail"] = self.encryption.decrypt_data(invoice["customerEmail"])
                # print("invoice after decryption: ", invoice["customerEmail"])
                invoice["customerPhone"] = self.encryption.decrypt_data(invoice["customerPhone"])
                invoice["createdBy"]["email"] = self.encryption.decrypt_data(invoice["createdBy"]["email"])
                invoice["createdBy"]["phone"] = self.encryption.decrypt_data(invoice["createdBy"]["phone"])

                return invoice

            except AppException:
                raise

            except Exception as e:
                print("Invoice get_by_id error:", e)
                raise AppException(
                    status_code=500,
                    message="Internal server error"
                )


    async def download_invoice(self, id: str, user: Dict[str, Any]):
        try:
            invoice_id = PydanticObjectId(id)
            
            is_super_admin = validate_admin(user.get("userRole", []))
            
           
            access_query = {"_id": invoice_id}
            
            if not is_super_admin:
                members = await self.getTeamMem.get_team_members(user["_id"])
                allowed_user_ids = []
                
                if members:
                    allowed_user_ids.extend([PydanticObjectId(m) for m in members])
                
                allowed_user_ids.append(PydanticObjectId(user["_id"]))
                
                access_query.update({
                    "createdBy.$id": {"$in": allowed_user_ids}
                })
            

            invoice = await self.repo.find_one(
                filter=access_query,
                populate=["createdBy", "updatedBy", "deal", "quotation"],
            )
            
            if not invoice:
                raise AppException(
                    403,
                    "You are not authorized to access this invoice or it does not exist"
                )

            invoice_data = jsonable_encoder(
                invoice,
                exclude={
                    "createdBy": {"password"},
                    "updatedBy": {"password"},
                },
            )
            

            if invoice_data.get("customerEmail"):
                invoice_data["customerEmail"] = self.encryption.decrypt_data(invoice_data["customerEmail"])
            if invoice_data.get("customerPhone"):
                invoice_data["customerPhone"] = self.encryption.decrypt_data(invoice_data["customerPhone"])
            if invoice_data.get("createdBy", {}).get("email"):
                invoice_data["createdBy"]["email"] = self.encryption.decrypt_data(invoice_data["createdBy"]["email"])
            if invoice_data.get("createdBy", {}).get("phone"):
                invoice_data["createdBy"]["phone"] = self.encryption.decrypt_data(invoice_data["createdBy"]["phone"])

            # Generate PDF
            pdf_buffer = await self._generate_invoice_pdf(invoice_data)
            
            # Return the PDF buffer and filename
            filename = f"invoice_{invoice_data['invoiceId']}_{datetime.now().strftime('%Y%m%d')}.pdf"
            
            return {
                "pdf_buffer": pdf_buffer,
                "filename": filename,
                "invoice_id": invoice_data['invoiceId']
            }

        except AppException as e:
            raise e

        except Exception as e:
            print("Invoice download_invoice error:", e)
            raise AppException(
                status_code=500,
                message="Internal server error while generating invoice PDF"
            )

    async def _generate_invoice_pdf(self, invoice_data: Dict[str, Any]) -> BytesIO:
        """
        Generate a professional PDF invoice using ReportLab
        """
        try:
            buffer = BytesIO()
            

            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=50,
                leftMargin=50,
                topMargin=50,
                bottomMargin=50
            )
            

            elements = []
            

            styles = getSampleStyleSheet()
            

            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1e40af'),
                spaceAfter=30,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=14,
                textColor=colors.HexColor('#1e40af'),
                spaceAfter=12,
                fontName='Helvetica-Bold'
            )
            
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontSize=10,
                spaceAfter=6
            )
            

            title = Paragraph("INVOICE", title_style)
            elements.append(title)
            elements.append(Spacer(1, 12))
            

            invoice_info_data = [
                ['Invoice ID:', invoice_data.get('invoiceId', 'N/A')],
                ['Issue Date:', self._format_date(invoice_data.get('issueDate'))],
                ['Due Date:', self._format_date(invoice_data.get('dueDate'))],
                ['Status:', str(invoice_data.get('status', 'N/A')).upper()],
            ]
            
            invoice_info_table = Table(invoice_info_data, colWidths=[2*inch, 3*inch])
            invoice_info_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
                ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            elements.append(invoice_info_table)
            elements.append(Spacer(1, 20))
            

            elements.append(Paragraph("BILL TO:", heading_style))
            
            customer_info = []
            if invoice_data.get('customerName'):
                customer_info.append(str(invoice_data['customerName']))
            if invoice_data.get('companyName'):
                customer_info.append(str(invoice_data['companyName']))
            if invoice_data.get('customerEmail'):
                customer_info.append(f"Email: {invoice_data['customerEmail']}")
            if invoice_data.get('customerPhone'):
                customer_info.append(f"Phone: {invoice_data['customerPhone']}")
            if invoice_data.get('billingAddress'):
                customer_info.append(f"Address: {invoice_data['billingAddress']}")
            
            for info in customer_info:
                elements.append(Paragraph(info, normal_style))
            
            elements.append(Spacer(1, 20))
            

            elements.append(Paragraph("ITEMS/SERVICES:", heading_style))
            
            items_data = [
                ['Description', 'Amount'],
            ]
            

            if invoice_data.get('deal'):
                deal = invoice_data['deal']
                deal_title = deal.get('title', 'Deal') if isinstance(deal, dict) else 'Deal'
                items_data.append([
                    str(deal_title),
                    f"${invoice_data.get('subTotal', 0):.2f}"
                ])
            else:
                # Fallback if no deal
                items_data.append([
                    'Services',
                    f"${invoice_data.get('subTotal', 0):.2f}"
                ])
            
            items_table = Table(items_data, colWidths=[4*inch, 2*inch])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            
            elements.append(items_table)
            elements.append(Spacer(1, 20))
            

            summary_data = [
                ['Subtotal:', f"${invoice_data.get('subTotal', 0):.2f}"],
                ['Total:', f"${invoice_data.get('total', 0):.2f}"],
            ]
            
            if invoice_data.get('paidAmount', 0) > 0:
                summary_data.append(['Paid Amount:', f"${invoice_data.get('paidAmount', 0):.2f}"])
                balance = invoice_data.get('total', 0) - invoice_data.get('paidAmount', 0)
                summary_data.append(['Balance Due:', f"${balance:.2f}"])
            
            summary_table = Table(summary_data, colWidths=[4*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1e40af')),
                ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1e40af')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
            ]))
            
            elements.append(summary_table)
            elements.append(Spacer(1, 30))
            

            if invoice_data.get('notes'):
                elements.append(Paragraph("NOTES:", heading_style))
                notes_para = Paragraph(str(invoice_data['notes']), normal_style)
                elements.append(notes_para)
                elements.append(Spacer(1, 20))
            

            if invoice_data.get('lastPaymentDate'):
                payment_info = f"Last Payment Date: {self._format_date(invoice_data['lastPaymentDate'])}"
                elements.append(Paragraph(payment_info, normal_style))
            

            elements.append(Spacer(1, 30))
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.grey,
                alignment=TA_CENTER
            )
            footer_text = "Thank you for your business!"
            elements.append(Paragraph(footer_text, footer_style))
            

            doc.build(elements)
            

            buffer.seek(0)
            return buffer

        except Exception as e:
            print("PDF generation error:", e)
            import traceback
            traceback.print_exc()
            raise AppException(
                status_code=500,
                message=f"Error generating PDF: {str(e)}"
            )

    def _format_date(self, date_value) -> str:
        """
        Format date to a readable string
        """
        if not date_value:
            return "N/A"
        
        try:
            # Handle datetime objects
            if isinstance(date_value, datetime):
                return date_value.strftime("%B %d, %Y")
            
            # Handle date objects
            if isinstance(date_value, date):
                return date_value.strftime("%B %d, %Y")
            
            # Handle objects with strftime method
            if hasattr(date_value, 'strftime'):
                return date_value.strftime("%B %d, %Y")
            
            # Handle string dates
            if isinstance(date_value, str):
                # Try to parse ISO format string
                date_obj = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                return date_obj.strftime("%B %d, %Y")
            
            return str(date_value)
            
        except Exception as e:
            print(f"Date formatting error: {e}")
            return str(date_value) if date_value else "N/A"
