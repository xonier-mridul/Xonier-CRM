import Swal from "sweetalert2";
import i18n from "i18next";

interface ConfirmPopupInterface {
  title: string;
  text?: string;
  btnTxt?: string;
  cancelTxt?: string;
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxDefaultChecked?: boolean;
  checkedBtnTxt?: string;
  checkedTitle?: string;
  checkedText?: string;
}

interface ConfirmPopupResult {
  isConfirmed: boolean;
  isChecked: boolean;
}

const ConfirmPopup = async ({
  title,
  text,
  btnTxt = "yes_continue",
  cancelTxt = "cancel",
  showCheckbox = false,
  checkboxLabel = "",
  checkboxDefaultChecked = false,
  checkedBtnTxt,
  checkedTitle,
  checkedText,
}: ConfirmPopupInterface): Promise<ConfirmPopupResult> => {
  const isDark = document.documentElement.classList.contains("dark");

  const btnText = i18n.t(btnTxt);
  const cancelText = i18n.t(cancelTxt);
  const checkedBtnText = checkedBtnTxt ? i18n.t(checkedBtnTxt) : btnText;

  const styleElement = document.createElement("style");
  styleElement.innerHTML = `
    .swal2-container.swal2-backdrop-show {
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      background-color: ${isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)"} !important;
      transition: all 0.3s ease !important;
    }
    .swal2-popup {
      box-shadow: 0 25px 50px -12px ${isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.25)"} !important;
    }
    .confirm-popup-checkbox-wrapper:hover {
      border-color: ${isDark ? "#6366f1" : "#818cf8"} !important;
    }
  `;
  document.head.appendChild(styleElement);

  const checkboxId = `confirm-popup-checkbox-${Date.now()}`;

  const result = await Swal.fire({
    title,
    html: `
      ${text ? `<p id="confirm-popup-desc" style="margin:0;">${text}</p>` : ""}
      ${showCheckbox ? `
        <label for="${checkboxId}" class="confirm-popup-checkbox-wrapper" style="margin-top:16px; display:flex; align-items:flex-start; gap:10px; text-align:left; padding:12px 14px; border-radius:14px; border:1.5px solid ${isDark ? "#334155" : "#e2e8f0"}; background:${isDark ? "rgba(15,23,42,0.5)" : "#f8fafc"}; cursor:pointer; transition: border-color 0.2s ease;">
          <input type="checkbox" id="${checkboxId}" ${checkboxDefaultChecked ? "checked" : ""} style="margin-top:2px; width:17px; height:17px; accent-color:#6366f1; cursor:pointer; flex-shrink:0;" />
          <span style="font-size:12.5px; font-weight:600; color:${isDark ? "#cbd5e1" : "#475569"}; line-height:1.4;">${checkboxLabel}</span>
        </label>
      ` : ""}
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: checkboxDefaultChecked ? checkedBtnText : btnText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    background: isDark ? "#1e293b" : "#ffffff",
    color: isDark ? "#f8fafc" : "#1f2937",
    buttonsStyling: false,
    showClass: {
      popup: "animate__animated animate__zoomIn animate__faster",
      backdrop: "animate__animated animate__fadeIn animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__zoomOut animate__faster",
      backdrop: "animate__animated animate__fadeOut animate__faster",
    },
    customClass: {
      popup: `
        rounded-2xl p-6 border shadow-2xl
        ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}
      `,
      title: "text-2xl font-bold mb-2",
      htmlContainer: `mt-2 ${
        isDark ? "text-slate-300 text-base" : "text-slate-600 text-base"
      }`,
      confirmButton:
        "px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl",
      cancelButton:
        "px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-all duration-200 cursor-pointer mr-3 shadow-lg hover:shadow-xl",
      actions: "gap-3 mt-6",
    },
    didOpen: () => {
      const container = document.querySelector(".swal2-container") as HTMLElement;
      if (container) {
        container.style.backdropFilter = "blur(10px)";
      }

      if (showCheckbox) {
        const checkbox = document.getElementById(checkboxId) as HTMLInputElement | null;
        const confirmBtn = Swal.getConfirmButton();
        const descEl = document.getElementById("confirm-popup-desc");
        const titleEl = Swal.getTitle();

        const syncUI = () => {
          if (!checkbox) return;
          if (confirmBtn) {
            confirmBtn.innerText = checkbox.checked ? checkedBtnText : btnText;
          }
          if (descEl) {
            descEl.innerText = checkbox.checked ? (checkedText ?? text ?? "") : (text ?? "");
          }
          if (titleEl) {
            titleEl.innerText = checkbox.checked ? (checkedTitle ?? title) : title;
          }
        };

        checkbox?.addEventListener("change", syncUI);
      }
    },
    preConfirm: () => {
      const checkbox = document.getElementById(checkboxId) as HTMLInputElement | null;
      return { isChecked: checkbox ? checkbox.checked : false };
    },
    willClose: () => {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    },
  });

  return {
    isConfirmed: result.isConfirmed,
    isChecked: result.isConfirmed ? Boolean(result.value?.isChecked) : false,
  };
};

export default ConfirmPopup;