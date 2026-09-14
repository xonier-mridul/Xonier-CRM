import { countryCode } from "@/src/types";
export const countryCodes = [
  { code: "+93", label: "Afghanistan", flag: "🇦🇫" },
  { code: "+355", label: "Albania", flag: "🇦🇱" },
  { code: "+213", label: "Algeria", flag: "🇩🇿" },
  { code: "+1-684", label: "American Samoa", flag: "🇦🇸" },
  { code: "+376", label: "Andorra", flag: "🇦🇩" },
  { code: "+244", label: "Angola", flag: "🇦🇴" },
  { code: "+1-264", label: "Anguilla", flag: "🇦🇮" },
  { code: "+672", label: "Antarctica", flag: "🇦🇶" },
  { code: "+1-268", label: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "+54", label: "Argentina", flag: "🇦🇷" },
  { code: "+374", label: "Armenia", flag: "🇦🇲" },
  { code: "+297", label: "Aruba", flag: "🇦🇼" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+43", label: "Austria", flag: "🇦🇹" },
  { code: "+994", label: "Azerbaijan", flag: "🇦🇿" },

  { code: "+973", label: "Bahrain", flag: "🇧🇭" },
  { code: "+880", label: "Bangladesh", flag: "🇧🇩" },
  { code: "+1-246", label: "Barbados", flag: "🇧🇧" },
  { code: "+375", label: "Belarus", flag: "🇧🇾" },
  { code: "+32", label: "Belgium", flag: "🇧🇪" },
  { code: "+501", label: "Belize", flag: "🇧🇿" },
  { code: "+229", label: "Benin", flag: "🇧🇯" },
  { code: "+975", label: "Bhutan", flag: "🇧🇹" },
  { code: "+591", label: "Bolivia", flag: "🇧🇴" },
  { code: "+387", label: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "+267", label: "Botswana", flag: "🇧🇼" },
  { code: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "+673", label: "Brunei", flag: "🇧🇳" },
  { code: "+359", label: "Bulgaria", flag: "🇧🇬" },

  { code: "+855", label: "Cambodia", flag: "🇰🇭" },
  { code: "+237", label: "Cameroon", flag: "🇨🇲" },
  { code: "+1", label: "Canada", flag: "🇨🇦" },
  { code: "+56", label: "Chile", flag: "🇨🇱" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+57", label: "Colombia", flag: "🇨🇴" },
  { code: "+506", label: "Costa Rica", flag: "🇨🇷" },
  { code: "+385", label: "Croatia", flag: "🇭🇷" },
  { code: "+53", label: "Cuba", flag: "🇨🇺" },
  { code: "+357", label: "Cyprus", flag: "🇨🇾" },
  { code: "+420", label: "Czech Republic", flag: "🇨🇿" },

  { code: "+45", label: "Denmark", flag: "🇩🇰" },

  { code: "+20", label: "Egypt", flag: "🇪🇬" },

  { code: "+358", label: "Finland", flag: "🇫🇮" },
  { code: "+33", label: "France", flag: "🇫🇷" },

  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+30", label: "Greece", flag: "🇬🇷" },

  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+62", label: "Indonesia", flag: "🇮🇩" },
  { code: "+98", label: "Iran", flag: "🇮🇷" },
  { code: "+964", label: "Iraq", flag: "🇮🇶" },
  { code: "+353", label: "Ireland", flag: "🇮🇪" },
  { code: "+972", label: "Israel", flag: "🇮🇱" },
  { code: "+39", label: "Italy", flag: "🇮🇹" },

  { code: "+81", label: "Japan", flag: "🇯🇵" },

  { code: "+254", label: "Kenya", flag: "🇰🇪" },
  { code: "+965", label: "Kuwait", flag: "🇰🇼" },

  { code: "+60", label: "Malaysia", flag: "🇲🇾" },
  { code: "+52", label: "Mexico", flag: "🇲🇽" },

  { code: "+977", label: "Nepal", flag: "🇳🇵" },
  { code: "+31", label: "Netherlands", flag: "🇳🇱" },

  { code: "+234", label: "Nigeria", flag: "🇳🇬" },

  { code: "+47", label: "Norway", flag: "🇳🇴" },

  { code: "+92", label: "Pakistan", flag: "🇵🇰" },
  { code: "+63", label: "Philippines", flag: "🇵🇭" },
  { code: "+48", label: "Poland", flag: "🇵🇱" },
  { code: "+351", label: "Portugal", flag: "🇵🇹" },

  { code: "+974", label: "Qatar", flag: "🇶🇦" },

  { code: "+40", label: "Romania", flag: "🇷🇴" },
  { code: "+7", label: "Russia", flag: "🇷🇺" },

  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "+27", label: "South Africa", flag: "🇿🇦" },
  { code: "+82", label: "South Korea", flag: "🇰🇷" },
  { code: "+34", label: "Spain", flag: "🇪🇸" },
  { code: "+94", label: "Sri Lanka", flag: "🇱🇰" },
  { code: "+46", label: "Sweden", flag: "🇸🇪" },
  { code: "+41", label: "Switzerland", flag: "🇨🇭" },

  { code: "+66", label: "Thailand", flag: "🇹🇭" },
  { code: "+90", label: "Turkey", flag: "🇹🇷" },

  { code: "+971", label: "UAE", flag: "🇦🇪" },
  { code: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", label: "United States", flag: "🇺🇸" },

  { code: "+84", label: "Vietnam", flag: "🇻🇳" },
];