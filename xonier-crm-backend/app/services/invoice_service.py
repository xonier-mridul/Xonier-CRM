from typing import Dict, Any, Optional
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from app.utils.custom_exception import AppException
from app.repositories.invoice_repository import InvoiceRepository
from beanie import PydanticObjectId
from app.core.constants import SUPER_ADMIN_CODE
from app.utils.get_team_members import GetTeamMembers
from app.utils.validate_admin import validate_admin, validate_admin_company_admin
from app.core.crypto import Encryption
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from io import BytesIO
from html import escape
from datetime import datetime, date
from app.repositories.activity_repository import ActivityRepository
from app.core.enums import ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE
from app.db.db import Client
from datetime import timezone
from app.core.config import get_setting
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from bson import ObjectId


from app.utils.activity_payload import activity_payload
from app.utils.enquiry_id_generator import generate_enquiry_id

class InvoiceService:
    def __init__(self):
        self.repo = InvoiceRepository()
        self.getTeamMem = GetTeamMembers()
        self.encryption = Encryption()
        self.activityRepo = ActivityRepository()
        self.client = Client

    async def create_standalone(self, payload: Dict[str, Any], user: Dict[str, Any]):
        try:
            data = {
                **payload,
                "invoiceId": generate_enquiry_id("INV"),
                "createdBy": PydanticObjectId(user["_id"]),
                "deal": None,
                "quotation": None,
            }
            invoice = await self.repo.create(data=data)
            if not invoice:
                raise AppException(400, "Invoice creation failed")
            activity = activity_payload(
                userId=PydanticObjectId(user["_id"]),
                entityType=ACTIVITY_ENTITY_TYPE.INVOICE,
                entityId=PydanticObjectId(invoice.id),
                action=ACTIVITY_ACTION.CREATED,
                title="create standalone invoice",
                metadata={"invoiceId": invoice.invoiceId},
            )
            await self.activityRepo.create(data=activity)
            return jsonable_encoder(invoice)
        except AppException:
            raise
        except Exception as e:
            print("Invoice creation error:", e)
            raise AppException(500, "Invoice creation failed")

    async def getAll(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page") or 1)
            limit = int(filters.get("limit") or 10)

            query = {}


            is_super_admin = validate_admin_company_admin(user["userRole"])

            
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

            if "search" in filters and filters["search"].strip():
                regex = {"$regex": filters["search"].strip(), "$options": "i"}

                search_query = {"$or" : [
                    {"customerName" : regex},
                    {"invoiceId": regex},
                    {"companyName": regex},
                    {"sourceQuoteId": regex}]}

                query.update(search_query)



            if "status" in filters:
                query.update({"status": filters["status"]})

            if "dealId" in filters:
                query.update({"deal": PydanticObjectId(filters["dealId"])})

            if "createdBy" in filters and is_super_admin:
                query.update({
                    "createdBy.$id": PydanticObjectId(filters["createdBy"])
                })

            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        from_dt = datetime.fromisoformat(str(filters["fromDate"]))
                        from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                        date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid fromDate format. Use ISO format: YYYY-MM-DD")

                if "toDate" in filters:
                    try:
                        to_dt = datetime.fromisoformat(str(filters["toDate"]))
                        to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
                        date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid toDate format. Use ISO format: YYYY-MM-DD")

                if date_filter:
                    query.update({"createdAt": date_filter})

            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy", "deal_id", "updatedBy"],
                sort=["-createdAt"]
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

        except AppException as e:
            raise e

        except Exception as e:
            print("Invoice getAll error:", e)
            raise AppException(
                status_code=500,
                message="Internal server error"
            )


    async def get_by_id(self, id: str, user: Dict[str, Any]):
            try:
                invoice_id = PydanticObjectId(id)

                is_super_admin = validate_admin_company_admin(user.get("userRole", []))


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

                
                if invoice["customerEmail"]:
                    invoice["customerEmail"] = self.encryption.decrypt_data(invoice["customerEmail"])
                if invoice["customerPhone"]:
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
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    invoice_id = PydanticObjectId(id)
                    
                    is_super_admin = validate_admin_company_admin(user.get("userRole", []))
                    
                   
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

                    invoice_data["companyBranding"] = await self._get_company_invoice_branding(
                        invoice_data.get("companyId") or user.get("companyId")
                    )

                    pdf_buffer = await self._generate_invoice_pdf(invoice_data)

                    activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.INVOICE.value, entityId=PydanticObjectId(invoice.id), action=ACTIVITY_ACTION.CREATED, title="create quotation", metadata={"quoteId": invoice.invoiceId, "subTotal": invoice.subTotal, "total": invoice.total, "customerName": invoice.customerName, "customerEmail": invoice_data.get("customerEmail")})

    
                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity creation failed")
                    
                    
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
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=48,
                leftMargin=48,
                topMargin=170,
                bottomMargin=112,
            )
            elements = []
            styles = getSampleStyleSheet()
            ink = colors.HexColor('#18233A')
            muted = colors.HexColor('#667085')
            accent = colors.HexColor('#283593')
            line = colors.HexColor('#E3E7F0')
            pale = colors.HexColor('#F6F7FB')

            eyebrow = ParagraphStyle('InvoiceEyebrow', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=10, textColor=muted, spaceAfter=5, tracking=0.7)
            body = ParagraphStyle('InvoiceBody', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=ink)
            customer_name = ParagraphStyle('InvoiceCustomer', parent=body, fontName='Helvetica-Bold', fontSize=12, leading=15, spaceAfter=4)
            small = ParagraphStyle('InvoiceSmall', parent=body, fontSize=8.5, leading=12, textColor=muted)
            section = ParagraphStyle('InvoiceSection', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=ink, spaceBefore=2, spaceAfter=10)
            table_header = ParagraphStyle('InvoiceTableHeader', parent=eyebrow, textColor=colors.white)
            detail_label = ParagraphStyle('InvoiceDetailLabel', parent=eyebrow, fontSize=6.7, leading=8, spaceAfter=0, tracking=0.1)
            detail_value = ParagraphStyle('InvoiceDetailValue', parent=body, fontSize=8, leading=10, spaceAfter=0)

            def safe(value: Any) -> str:
                return escape(self._pdf_text(value)).replace("\n", "<br/>")

            currency = str(invoice_data.get('currency') or 'USD')
            def money(value: Any) -> str:
                try:
                    return f"{currency} {float(value or 0):,.2f}"
                except (TypeError, ValueError):
                    return f"{currency} 0.00"

            # Compact two-column identity block gives the customer and invoice dates equal weight.
            customer_parts = []
            if invoice_data.get('customerName'):
                customer_parts.append(Paragraph(safe(invoice_data['customerName']), customer_name))
            if invoice_data.get('companyName'):
                customer_parts.append(Paragraph(safe(invoice_data['companyName']), body))
            for label, key in (('Email', 'customerEmail'), ('Phone', 'customerPhone'), ('Address', 'billingAddress')):
                if invoice_data.get(key):
                    customer_parts.append(Paragraph(f"<font color='#667085'>{label}</font>  {safe(invoice_data[key])}", small))
            if not customer_parts:
                customer_parts.append(Paragraph('Customer details not provided', small))

            details = [
                [Paragraph('ISSUE DATE', detail_label), Paragraph(safe(self._format_date(invoice_data.get('issueDate'))), detail_value),
                 Paragraph('DUE DATE', detail_label), Paragraph(f"<b>{safe(self._format_date(invoice_data.get('dueDate')))}</b>", detail_value)],
                [Paragraph('STATUS', detail_label), Paragraph(f"<b>{safe(str(invoice_data.get('status') or 'Issued').replace('_', ' ').title())}</b>", detail_value),
                 Paragraph('CURRENCY', detail_label), Paragraph(safe(currency), detail_value)],
            ]
            if invoice_data.get('sourceQuoteId'):
                details.append([
                    Paragraph('SOURCE QUOTE', detail_label), Paragraph(f"<b>{safe(invoice_data['sourceQuoteId'])}</b>", detail_value),
                    Paragraph('', detail_label), Paragraph('', detail_value)
                ])

            detail_table = Table(details, colWidths=[0.8*inch, 1.1*inch, 0.75*inch, 1.1*inch])
            detail_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), pale), ('BOX', (0, 0), (-1, -1), 0.6, line),
                ('LINEBELOW', (0, 0), (-1, -2), 0.35, line), ('LINEBEFORE', (2, 0), (2, -1), 0.35, line),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ]))
            customer_block = [Paragraph('BILLED TO (BUYER / CUSTOMER)', eyebrow), *customer_parts]
            identity = Table([[customer_block, detail_table]], colWidths=[3.15*inch, 3.75*inch])
            identity.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            title = invoice_data.get('invoiceTitle') or invoice_data.get('description')
            if title:
                elements.append(Paragraph(safe(title), ParagraphStyle(
                    'InvoiceTitle', parent=body, fontName='Helvetica-Bold', fontSize=14,
                    leading=18, textColor=ink, spaceAfter=8,
                )))
            elements.extend([identity, Spacer(1, 22), Paragraph('Billable Services & Merchandise', section)])

            raw_items = invoice_data.get('lineItems') or []
            item_rows = [[
                Paragraph('NO.', table_header), Paragraph('DESCRIPTION', table_header),
                Paragraph('QTY', table_header), Paragraph('UNIT PRICE', table_header), Paragraph('AMOUNT', table_header),
            ]]
            if raw_items:
                for index, item in enumerate(raw_items, start=1):
                    if hasattr(item, 'model_dump'):
                        item = item.model_dump()
                    if not isinstance(item, dict):
                        continue
                    description = safe(item.get('description') or 'Service')
                    unit = safe(item.get('unit') or '')
                    qty = item.get('quantity', 1)
                    try:
                        qty_label = f"{float(qty):g}" + (f" {unit}" if unit else '')
                    except (TypeError, ValueError):
                        qty_label = str(qty)
                    item_rows.append([
                        Paragraph(f"{index:02d}", small), Paragraph(description, body),
                        Paragraph(safe(qty_label), small), Paragraph(money(item.get('unitPrice')), small),
                        Paragraph(money(item.get('total')), body),
                    ])
            else:
                deal = invoice_data.get('deal')
                deal_title = deal.get('title', 'Services') if isinstance(deal, dict) else 'Services'
                item_rows.append([Paragraph('01', small), Paragraph(safe(deal_title), body), Paragraph('—', small), Paragraph('—', small), Paragraph(money(invoice_data.get('subTotal')), body)])

            item_table = Table(item_rows, colWidths=[0.48*inch, 3.12*inch, 0.65*inch, 1.2*inch, 1.45*inch], repeatRows=1, hAlign='LEFT')
            item_style = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#202B72')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('LINEBELOW', (0, 0), (-1, 0), 0.8, accent),
                ('LINEBELOW', (0, 1), (-1, -1), 0.45, line),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 1), (0, -1), 'CENTER'),
                ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 11), ('BOTTOMPADDING', (0, 0), (-1, -1), 11),
            ]
            item_table.setStyle(TableStyle(item_style))
            elements.extend([item_table, Spacer(1, 18)])

            totals = []
            for label, key in (('Subtotal', 'subTotal'), ('Discount', 'discountAmount'), ('Tax / GST', 'taxAmount'), ('Shipping / Handling', 'shippingAmount')):
                amount = invoice_data.get(key)
                if key == 'subTotal' or amount not in (None, 0, 0.0):
                    amount_label = f"− {money(amount)}" if key == 'discountAmount' else money(amount)
                    totals.append([Paragraph(safe(label), small), Paragraph(amount_label, body)])
            totals.append([Paragraph('<b>Total Invoice Amount</b>', body), Paragraph(f"<font color='{accent.hexval()}'><b>{money(invoice_data.get('total'))}</b></font>", body)])
            paid = float(invoice_data.get('paidAmount') or 0)
            balance = float(invoice_data.get('total') or 0) - paid
            if paid > 0:
                totals.append([Paragraph('Less: Amount Paid', small), Paragraph(f"− {money(paid)}", small)])
            totals.append([Paragraph('<b>Balance Due / Payable</b>', body), Paragraph(f"<font color='#B91C1C'><b>{money(balance)}</b></font>", body)])

            totals_table = Table(totals, colWidths=[1.8*inch, 1.6*inch], hAlign='RIGHT')
            totals_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT'), ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('LINEABOVE', (0, len(totals)-1), (-1, len(totals)-1), 1.2, colors.HexColor('#B91C1C')),
                ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            totals_wrap = Table([
                [Paragraph(f"<font color='#667085'><i>* Payment is strictly due by <b>{safe(self._format_date(invoice_data.get('dueDate')))}</b>.</i></font>", small),
                 totals_table]
            ], colWidths=[3.5*inch, 3.4*inch], hAlign='LEFT')
            totals_wrap.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            elements.append(totals_wrap)

            # Payment Instructions & Remittance (Unique to Invoice!)
            pay_elements = [
                Paragraph(f"• <b>Remittance Advice:</b> Please remit payment referencing <b>Invoice #{safe(invoice_data.get('invoiceId'))}</b>.", small),
                Paragraph(f"• <b>Settlement Due Date:</b> Kindly ensure funds are cleared on or before <b>{safe(self._format_date(invoice_data.get('dueDate')))}</b>.", small),
            ]
            if invoice_data.get('paymentTerms'):
                pay_elements.append(Paragraph(f"• <b>Payment Terms:</b> {safe(invoice_data['paymentTerms'])}", small))
            if invoice_data.get('notes'):
                pay_elements.append(Paragraph(f"• <b>Payment Notes:</b> {safe(invoice_data['notes'])}", small))
            if invoice_data.get('termsAndConditions'):
                pay_elements.append(Paragraph(f"• <b>Terms & Conditions:</b> {safe(invoice_data['termsAndConditions'])}", small))

            pay_table = Table([[pay_elements]], colWidths=[6.9*inch])
            pay_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), pale),
                ('BOX', (0,0), (-1,-1), 0.5, line),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ]))
            elements.extend([Spacer(1, 16), Paragraph('Payment Instructions & Remittance', section), pay_table])

            # Issuer Signatory Block
            comp_name = safe(invoice_data.get('companyBranding', {}).get('companyName') or 'Company')
            sign_table = Table([[
                Paragraph("<font color='#667085'><i>This is an official computer-generated tax invoice. No physical seal is required.</i></font>", small),
                [
                    Paragraph(f"<b>For {comp_name}</b>", body),
                    Spacer(1, 20),
                    Paragraph("Authorized Signatory", small),
                ]
            ]], colWidths=[4.3*inch, 2.6*inch])
            sign_table.setStyle(TableStyle([
                ('ALIGN', (1,0), (1,0), 'RIGHT'),
                ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ]))
            elements.extend([Spacer(1, 14), sign_table])

            branding = {
                **(invoice_data.get("companyBranding", {}) or {}),
                "invoiceId": invoice_data.get("invoiceId", ""),
                "sourceQuoteId": invoice_data.get("sourceQuoteId", ""),
            }
            doc.build(
                elements,
                onFirstPage=lambda canvas, document: self._draw_invoice_branding(
                    canvas, document, branding
                ),
                onLaterPages=lambda canvas, document: self._draw_invoice_branding(
                    canvas, document, branding
                ),
            )
            

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

    async def _get_company_invoice_branding(self, company_id: Any) -> Dict[str, Any]:
        if isinstance(company_id, dict):
            company_id = company_id.get("id") or company_id.get("_id")
        if not company_id or not ObjectId.is_valid(str(company_id)):
            return {}

        database = self.client[get_setting().DATABASE_NAME]
        company = await database["companies"].find_one({"_id": ObjectId(str(company_id))})
        if not company:
            return {}

        def decrypt_optional(value: Optional[str]) -> str:
            if not value:
                return ""
            try:
                return self.encryption.decrypt_data(value)
            except Exception:
                return value

        branding = {
            "companyName": company.get("companyName", ""),
            "address": company.get("address", ""),
            "email": decrypt_optional(company.get("email")),
            "phone": decrypt_optional(company.get("number")),
            "website": company.get("website", ""),
            "registrationNumber": company.get("registrationNumber", ""),
            "tradeNumber": company.get("tradeNumber", ""),
        }

        logo_file_id = company.get("logoFileId")
        if logo_file_id and ObjectId.is_valid(str(logo_file_id)):
            try:
                bucket = AsyncIOMotorGridFSBucket(database, bucket_name="company_logos")
                logo_stream = await bucket.open_download_stream(ObjectId(str(logo_file_id)))
                branding["logoBytes"] = await logo_stream.read()
            except Exception:
                # Missing or unreadable branding should not prevent invoice download.
                pass

        return branding

    @staticmethod
    def _pdf_text(value: Any) -> str:
        """Keep canvas drawing safe for ReportLab's built-in Helvetica fonts."""
        return str(value or "").encode("latin-1", "replace").decode("latin-1")

    def _draw_invoice_branding(self, canvas: Canvas, doc, branding: Dict[str, Any]) -> None:
        page_width, page_height = A4
        left = doc.leftMargin
        right = page_width - doc.rightMargin
        accent = colors.HexColor("#283593")
        deep = colors.HexColor("#151B4F")
        ink = colors.HexColor("#17233C")
        muted = colors.HexColor("#D6DCF8")
        company_name = self._pdf_text(branding.get("companyName") or "Company")

        canvas.saveState()
        # Full-width blue masthead with an editorial curved edge inspired by the reference.
        header = canvas.beginPath()
        header.moveTo(0, page_height)
        header.lineTo(page_width, page_height)
        header.lineTo(page_width, page_height - 112)
        header.curveTo(page_width * 0.76, page_height - 132, page_width * 0.59, page_height - 146, page_width * 0.43, page_height - 151)
        header.curveTo(page_width * 0.23, page_height - 157, page_width * 0.11, page_height - 139, 0, page_height - 158)
        header.close()
        canvas.setFillColor(deep)
        canvas.drawPath(header, stroke=0, fill=1)

        # Fine indigo highlight echoes the wave without overpowering the document.
        wave = canvas.beginPath()
        wave.moveTo(0, page_height - 162)
        wave.curveTo(page_width * 0.22, page_height - 143, page_width * 0.34, page_height - 164, page_width * 0.49, page_height - 155)
        wave.curveTo(page_width * 0.68, page_height - 144, page_width * 0.83, page_height - 139, page_width, page_height - 116)
        canvas.setStrokeColor(colors.HexColor("#5664C7"))
        canvas.setLineWidth(1.2)
        canvas.drawPath(wave, stroke=1, fill=0)

        logo_bytes = branding.get("logoBytes")
        logo_x, logo_y, logo_w, logo_h = left, page_height - 102, 58, 52
        canvas.setFillColor(colors.white)
        canvas.roundRect(logo_x - 5, logo_y - 4, logo_w + 10, logo_h + 8, 8, stroke=0, fill=1)
        if logo_bytes:
            try:
                canvas.drawImage(
                    ImageReader(BytesIO(logo_bytes)),
                    logo_x,
                    logo_y,
                    width=logo_w,
                    height=logo_h,
                    preserveAspectRatio=True,
                    anchor="c",
                    mask="auto",
                )
            except Exception:
                self._draw_company_monogram(canvas, logo_x, logo_y, logo_w, logo_h, company_name, accent)
        else:
            self._draw_company_monogram(canvas, logo_x, logo_y, logo_w, logo_h, company_name, accent)

        company_x = left + 76
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 12)
        company_column_width = right - company_x - 178
        canvas.drawString(
            company_x,
            page_height - 53,
            self._fit_pdf_text(company_name, company_column_width, "Helvetica-Bold", 12),
        )

        address = self._pdf_text(branding.get("address"))
        company_lines = []
        if address:
            address_parts = [part.strip() for part in address.replace("\n", ", ").split(",") if part.strip()]
            company_lines.extend(address_parts[:2])
        contacts = [branding.get("email"), branding.get("phone"), branding.get("website")]
        contact_line = "  |  ".join(self._pdf_text(item) for item in contacts if item)
        if contact_line:
            company_lines.append(contact_line)

        canvas.setFillColor(muted)
        canvas.setFont("Helvetica", 8)
        for index, line in enumerate(company_lines[:3]):
            canvas.drawString(
                company_x,
                page_height - 68 - (index * 11),
                self._fit_pdf_text(line, company_column_width, "Helvetica", 8),
            )

        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 24)
        canvas.drawRightString(right, page_height - 50, "TAX INVOICE")
        canvas.setFillColor(colors.HexColor("#C8D0FF"))
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.drawRightString(right, page_height - 65, "OFFICIAL PAYMENT DEMAND")
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica", 7.5)
        invoice_id = self._fit_pdf_text(branding.get("invoiceId", ""), 210, "Helvetica", 7.5)
        if invoice_id:
            canvas.drawRightString(right, page_height - 79, f"Invoice #: {invoice_id}")
        source_quote = self._pdf_text(branding.get("sourceQuoteId", ""))
        if source_quote:
            canvas.setFillColor(colors.HexColor("#93C5FD"))
            canvas.setFont("Helvetica-Bold", 7.2)
            canvas.drawRightString(right, page_height - 92, f"Ref Quote: {source_quote}")
        footer = canvas.beginPath()
        footer.moveTo(0, 0)
        footer.lineTo(page_width, 0)
        footer.lineTo(page_width, 88)
        footer.curveTo(page_width * 0.78, 72, page_width * 0.6, 69, page_width * 0.44, 78)
        footer.curveTo(page_width * 0.25, 89, page_width * 0.12, 74, 0, 98)
        footer.close()
        canvas.setFillColor(deep)
        canvas.drawPath(footer, stroke=0, fill=1)
        canvas.setStrokeColor(colors.HexColor("#5664C7"))
        canvas.setLineWidth(1.2)
        footer_wave = canvas.beginPath()
        footer_wave.moveTo(0, 101)
        footer_wave.curveTo(page_width * 0.18, 78, page_width * 0.31, 99, page_width * 0.47, 84)
        footer_wave.curveTo(page_width * 0.68, 66, page_width * 0.84, 78, page_width, 91)
        canvas.drawPath(footer_wave, stroke=1, fill=0)

        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(left, 49, "THANK YOU FOR YOUR BUSINESS")
        footer_contact = "   |   ".join(self._pdf_text(item) for item in (branding.get("phone"), branding.get("email")) if item)
        canvas.setFont("Helvetica", 7)
        if footer_contact:
            canvas.drawString(left, 34, self._fit_pdf_text(footer_contact, 270, "Helvetica", 7))
        website = self._pdf_text(branding.get("website"))
        address = self._pdf_text(branding.get("address")).replace("\n", ", ")
        if website:
            canvas.drawRightString(right, 51, self._fit_pdf_text(website, 260, "Helvetica", 7))
        if address:
            canvas.drawRightString(right, 39, self._fit_pdf_text(address, 260, "Helvetica", 7))
        canvas.setFillColor(colors.HexColor("#CBD2F7"))
        canvas.setFont("Helvetica", 7)
        legal_items = [f"Reg. {self._pdf_text(branding['registrationNumber'])}" for _ in [0] if branding.get("registrationNumber")]
        legal_items.extend([f"Trade {self._pdf_text(branding['tradeNumber'])}" for _ in [0] if branding.get("tradeNumber")])
        if legal_items:
            canvas.drawRightString(right, 27, self._fit_pdf_text("   |   ".join(legal_items), 260, "Helvetica", 7))
        company_page = f"{self._pdf_text(branding.get('companyName') or 'Company')}   |   Page {doc.page}"
        canvas.drawRightString(right, 14, self._fit_pdf_text(company_page, 260, "Helvetica", 7))
        canvas.restoreState()

    @staticmethod
    def _draw_company_monogram(canvas: Canvas, x: float, y: float, width: float, height: float, name: str, accent) -> None:
        canvas.setFillColor(colors.HexColor("#EEF1FF"))
        canvas.roundRect(x, y, width, height, 7, stroke=0, fill=1)
        initials = "".join(word[0] for word in name.split()[:2]).upper() or "C"
        canvas.setFillColor(accent)
        canvas.setFont("Helvetica-Bold", 17)
        canvas.drawCentredString(x + width / 2, y + height / 2 - 6, initials)

    @classmethod
    def _fit_pdf_text(cls, value: Any, max_width: float, font: str, font_size: float) -> str:
        text = cls._pdf_text(value)
        if stringWidth(text, font, font_size) <= max_width:
            return text
        while text and stringWidth(text + "...", font, font_size) > max_width:
            text = text[:-1]
        return f"{text.rstrip()}..." if text else ""

    def _format_date(self, date_value) -> str:
        if not date_value:
            return "N/A"
        
        try:
            
            if isinstance(date_value, datetime):
                return date_value.strftime("%B %d, %Y")
            
            
            if isinstance(date_value, date):
                return date_value.strftime("%B %d, %Y")
            
           
            if hasattr(date_value, 'strftime'):
                return date_value.strftime("%B %d, %Y")
            

            if isinstance(date_value, str):

                date_obj = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                return date_obj.strftime("%B %d, %Y")
            
            return str(date_value)
            
        except Exception as e:
            print(f"Date formatting error: {e}")
            return str(date_value) if date_value else "N/A"
