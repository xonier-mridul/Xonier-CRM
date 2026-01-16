import Swal from "sweetalert2";


 const ConfirmPopup = async ({
  title,
  text,
  btnTxt
}: ConfirmPopupInterface): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: btnTxt ? btnTxt : "Yes",
  });

  return result.isConfirmed;
};

export default ConfirmPopup
