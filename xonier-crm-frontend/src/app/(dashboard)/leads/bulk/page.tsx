"use client"
import extractErrorMessages from '@/src/app/utils/error.utils';
import LeadService from '@/src/services/lead.service';
import { UserFormService } from '@/src/services/userForm.service';
import { UserForm } from '@/src/types/userForm/userForm.types';
import { BulkLeadPayload, LeadPayload } from '@/src/types/leads/leads.types';
import { COUNTRY_CODE, EMPLOYEE_SENIORITY, INDUSTRIES, LANGUAGE_CODE, PRIORITY, PROJECT_TYPES, SALES_STATUS, SOURCE } from '@/src/constants/enum';
import axios from 'axios';
import React, { JSX, useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { Upload, Download, X, FileText, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface ParsedLead {
  [key: string]: string | number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const BulkLeadUpload = (): JSX.Element => {
  const [userFormData, setUserFormData] = useState<UserForm | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | string[]>("");
  

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);
  

  const getFormFields = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await UserFormService.getAllLead();
      if (result.status === 200) {
        setUserFormData(result.data.data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getFormFields();
  }, []);


  const downloadCSVTemplate = () => {
    if (!userFormData?.selectedFormFields) {
      toast.error("Form fields not loaded");
      return;
    }

    const headers = userFormData.selectedFormFields.map(field => field.key);
    const csvContent = headers.join(',') + '\n';
    

    const exampleRow = userFormData.selectedFormFields.map(field => {
      switch (field.type) {
        case 'email':
          return 'example@email.com';
        case 'text':
          return field.key === 'phone' ? '+919876543210' : `example_${field.key}`;
        case 'number':
          return '12345';
        case 'select':
          return field.options?.[0]?.value || '';
        default:
          return '';
      }
    }).join(',');

    const blob = new Blob([csvContent + exampleRow], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV template downloaded successfully');
  };


  const validateHeaders = (headers: string[]): boolean => {
    if (!userFormData?.selectedFormFields) return false;

    const requiredHeaders = userFormData.selectedFormFields
      .filter(field => field.required)
      .map(field => field.key);

    const availableHeaders = userFormData.selectedFormFields.map(field => field.key);


    const missingRequired = requiredHeaders.filter(h => !headers.includes(h));
    if (missingRequired.length > 0) {
      toast.error(`Missing required columns: ${missingRequired.join(', ')}`);
      return false;
    }


    const invalidHeaders = headers.filter(h => !availableHeaders.includes(h));
    if (invalidHeaders.length > 0) {
      toast.warning(`Unknown columns will be ignored: ${invalidHeaders.join(', ')}`);
    }

    return true;
  };


  const validateLeadData = (data: ParsedLead[], startIndex: number = 0): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!userFormData?.selectedFormFields) return errors;

    data.forEach((lead, index) => {
      const rowNumber = startIndex + index + 2; 

      userFormData.selectedFormFields.forEach(field => {
        const value = lead[field.key];


        if (field.required && (!value || value === '')) {
          errors.push({
            row: rowNumber,
            field: field.key,
            message: `${field.name} is required`
          });
        }

        if (value) {
          switch (field.type) {
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(String(value))) {
                errors.push({
                  row: rowNumber,
                  field: field.key,
                  message: 'Invalid email format'
                });
              }
              break;

            case 'number':
              if (isNaN(Number(value))) {
                errors.push({
                  row: rowNumber,
                  field: field.key,
                  message: 'Must be a number'
                });
              }
              break;

            case 'select':
              if (field.options) {
                const validValues = field.options.map(opt => opt.value);
                if (!validValues.includes(String(value))) {
                  errors.push({
                    row: rowNumber,
                    field: field.key,
                    message: `Invalid value. Must be one of: ${validValues.join(', ')}`
                  });
                }
              }
              break;

            case 'text':

              if (field.key === 'phone') {
                const phoneRegex = /^\+?[1-9]\d{9,14}$/;
                if (!phoneRegex.test(String(value).replace(/\s/g, ''))) {
                  errors.push({
                    row: rowNumber,
                    field: field.key,
                    message: 'Invalid phone format (e.g., +919876543210)'
                  });
                }
              }

              if (field.key === 'fullName' && String(value).trim().length < 5) {
                errors.push({
                  row: rowNumber,
                  field: field.key,
                  message: 'Full name must be at least 5 characters'
                });
              }
              break;
          }
        }
      });
    });

    return errors;
  };


  const parseCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        
        if (!validateHeaders(headers)) {
          setFile(null);
          return;
        }

        const data = results.data as ParsedLead[];
        

        const errors = validateLeadData(data);
        setValidationErrors(errors);

        if (errors.length > 0) {
          toast.warning(`Found ${errors.length} validation errors. Please review and fix them.`);
        } else {
          toast.success(`Successfully parsed ${data.length} leads`);
        }

        setParsedData(data);
        setCurrentPage(1);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setFile(null);
      }
    });
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      parseCSVFile(selectedFile);
    }
  };


  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'text/csv' && !droppedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(droppedFile);
      parseCSVFile(droppedFile);
    }
  }, []);


  const handleRemoveFile = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setCurrentPage(1);
  };

  const handleDeleteRow = (globalIndex: number) => {
    const updatedData = parsedData.filter((_, index) => index !== globalIndex);
    setParsedData(updatedData);
    

    const errors = validateLeadData(updatedData);
    setValidationErrors(errors);
    

    const newTotalPages = Math.ceil(updatedData.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
    
    toast.success('Row deleted successfully');
    

    if (updatedData.length === 0) {
      handleRemoveFile();
    }
  };


  const handleDeleteAllRows = () => {
    
    if (window.confirm('Are you sure you want to delete all rows? This action cannot be undone.')) {
      handleRemoveFile();
      toast.success('All rows deleted');
    }
  };


  const handleBulkUpload = async () => {
    if (!parsedData.length) {
      toast.error('No data to upload');
      return;
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    setIsUploading(true);
    try {
      
      const leadsPayload: LeadPayload[] = parsedData.map(lead => {
        const transformedLead: LeadPayload = {
          fullName: String(lead.fullName || ''),
          email: String(lead.email || ''),
          phone: String(lead.phone || ''),
          priority: (lead.priority as PRIORITY) || ("" as any),
          source: (lead.source as SOURCE) || ("" as any),
          projectType: (lead.projectType as PROJECT_TYPES) || ("" as any),
          status: (lead.status as SALES_STATUS) || ("" as any),
        };
        
        
        userFormData?.selectedFormFields.forEach(field => {
          const value = lead[field.key];
          
          if (value !== undefined && value !== '') {
            switch (field.key) {
              case 'companyName':
              case 'city':
              case 'employeeRole':
              case 'message':
              case 'membershipNotes':
                transformedLead[field.key] = String(value);
                break;
              
              case 'postalCode':
                transformedLead.postalCode = Number(value);
                break;
              
              case 'country':
                transformedLead.country = value as COUNTRY_CODE;
                break;
              
              case 'language':
                transformedLead.language = value as LANGUAGE_CODE;
                break;
              
              case 'industry':
                transformedLead.industry = value as INDUSTRIES;
                break;
              
              case 'employeeSeniority':
                transformedLead.employeeSeniority = value as EMPLOYEE_SENIORITY;
                break;
            }
          }
        });

        return transformedLead;
      });

      const payload: BulkLeadPayload = { leads: leadsPayload };

      const result = await LeadService.bulkCreate(payload);

      if (result.status === 201) {
        toast.success(
          // `Successfully created ${result.data.inserted} leads. Skipped ${result.data.skipped} duplicates.`
          result.data.message
        );
        
        // Reset state
        handleRemoveFile();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(Array.isArray(messages) ? messages[0] : messages);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsUploading(false);
    }
  };


  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = parsedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(parsedData.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);


  const getErrorsForRow = (globalIndex: number): ValidationError[] => {
    const rowNumber = globalIndex + 2;
    return validationErrors.filter(err => err.row === rowNumber);
  };

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bulk Lead Upload</h1>
          <p className="text-gray-600 dark:text-gray-500">Upload multiple leads at once using a CSV file</p>
        </div>

        
        <div className="bg-white dark:bg-gray-700 rounded-lg border border-slate-900/10 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Step 1: Download Template</h2>
              <p className="text-gray-600 dark:text-gray-500 mb-4">
                Download the CSV template with the correct column headers based on your form fields.
              </p>
            </div>
            <button
              onClick={downloadCSVTemplate}
              disabled={isLoading || !userFormData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={20} />
              Download Template
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg border border-slate-900/10 dark:bg-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Step 2: Upload CSV File</h2>
          
          {!file ? (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-400 mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-gray-500 mb-4">or</p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block transition-colors">
                  Choose File
                </span>
              </label>
              <p className="text-sm text-gray-500  mt-4">Only CSV files are accepted</p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-500 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-600" size={32} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-200">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB • {parsedData.length} rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 dark:bg-gray-700 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">
                  Validation Errors ({validationErrors.length})
                </h3>
                <div className="max-h-40 overflow-y-auto">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <p key={index} className="text-sm text-red-700 mb-1">
                      Row {error.row}, Column "{error.field}": {error.message}
                    </p>
                  ))}
                  {validationErrors.length > 10 && (
                    <p className="text-sm text-red-700 font-medium mt-2">
                      ... and {validationErrors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {parsedData.length > 0 && (
          <div className="bg-white dark:bg-gray-700 rounded-lg border border-slate-900/10 mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Step 3: Review Data</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Review your data before uploading ({parsedData.length} total rows)
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAllRows}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium border border-red-300"
                  >
                    <Trash2 size={18} />
                    Delete All
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={isUploading || validationErrors.length > 0}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Upload Leads
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50  dark:bg-transparent border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100  uppercase tracking-wider">
                      Row
                    </th>
                    {userFormData?.selectedFormFields.map((field) => (
                      <th
                        key={field.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100  uppercase tracking-wider"
                      >
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200">
                  {currentItems.map((lead, index) => {
                    const globalIndex = indexOfFirstItem + index;
                    const rowErrors = getErrorsForRow(globalIndex);
                    const hasError = rowErrors.length > 0;

                    return (
                      <tr
                        key={index}
                        className={hasError ? 'bg-red-50' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteRow(globalIndex)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                            title="Delete this row"
                          >
                            <Trash2 size={16} className="text-gray-400 group-hover:text-red-600" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {globalIndex + 1}
                          {hasError && (
                            <AlertCircle className="inline-block ml-2 text-red-500" size={16} />
                          )}
                        </td>
                        {userFormData?.selectedFormFields.map((field) => {
                          const value = lead[field.key];
                          const fieldError = rowErrors.find(err => err.field === field.key);
                          
                          return (
                            <td
                              key={field.id}
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                fieldError ? 'text-red-900 font-medium' : 'text-gray-900 dark:text-white'
                              }`}
                              title={fieldError?.message}
                            >
                              {value || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, parsedData.length)} of{' '}
                  {parsedData.length} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => paginate(pageNum)}
                        className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkLeadUpload;