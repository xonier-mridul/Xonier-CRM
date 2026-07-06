import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";

interface CustomDropdownProps {
  dropdownRef: React.RefObject<HTMLDivElement>;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  data: any[];
  filteredData: any[];
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSearch: string;
  setOnSearch: React.Dispatch<React.SetStateAction<string>>;
  text: string;
  field?: string;
getLabel: (item: any) => string;
onSelect?: (item: any) => void;

}

const CustomDropdown = ({dropdownRef,formData,onSelect,setFormData,data,isOpen,setIsOpen,onSearch,setOnSearch,filteredData,text,field,getLabel}: CustomDropdownProps) => {
const selectedItem = data.find((c) => c.id === formData[field]);


  return (
    <div className="relative w-full" ref={dropdownRef}>
  
                    <button
                      type="button"
                      onClick={() => setIsOpen(!isOpen)}
                      className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm"
                    >
                      <span>
                        {selectedItem ? getLabel(selectedItem) : `Select ${text}`}
                        </span>
  
                      <FiChevronDown
                        className={`transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
  
                    {isOpen && (
                      <div className="absolute left-0 mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50">
                      
                        <div className="relative p-2 border-b border-slate-200 dark:border-gray-700">
                          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
  
                          <input
                            type="text"
                            placeholder={`Search ${text}...`}
                            value={onSearch}
                            onChange={(e) => setOnSearch(e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent py-2 pl-10 pr-3 text-sm outline-none"
                          />
                        </div>
  
                      
                        <div className="max-h-60 overflow-y-auto ">
                          {filteredData.length > 0 ? (
                            filteredData.map((i) => (
                              <button
                                key={i.id}
                                type="button"
                               onClick={() => {
                                if (onSelect) {
                                    onSelect(i);
                                } else {
                                    setFormData((prev: any) => ({
                                    ...prev,
                                    [field]: i.id,
                                    }));
                                }

                                setIsOpen(false);
                                setSearch("");
                                }}
                                className="flex w-full items-center my-2 justify-between capitalize px-4 py-2 text-left text-sm hover:bg-cyan-50 dark:hover:bg-gray-700"
                              >
                               <span>{getLabel(i)}</span>
  
                                {formData[field] === i.id && (
                                  <FiCheck className="text-cyan-600" />
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              No {text} found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
  )
}

export default CustomDropdown