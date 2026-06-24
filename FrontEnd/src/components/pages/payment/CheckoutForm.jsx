import { useState } from "react";
import { FaRegCreditCard } from "react-icons/fa6"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCcVisa,
  faCcMastercard,
  faCcAmex,
} from "@fortawesome/free-brands-svg-icons";
import paymentServices from "../../../services/payment.services";

const CheckoutForm = ({ Amount }) => {
  const [formData, setFormData] = useState({
    name: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
  const [isLoading,setIsLoading] = useState(false)
  const [cardType, setCardType] = useState('')



  const changeHandler = (e) => {
    const { name, value } = e.target;

    if (name === "cardNumber") {
      let cleaned = value.replace(/\D/g, "");

      const type = getCardType(cleaned);
      setCardType(type);

      if (type === "American Express") {
        cleaned = cleaned.slice(0, 15);
      } else {
        cleaned = cleaned.slice(0, 16);
      }

      const formatted = cleaned
        .replace(/(.{4})/g, "$1 ")
        .trim();

      setFormData((prev) => ({
        ...prev,
        cardNumber: formatted,
      }));

      return;
    }

    if (name === "cvv") {
      const limit = cardType === "American Express" ? 4 : 3;

      setFormData((prev) => ({
        ...prev,
        cvv: value.replace(/\D/g, "").slice(0, limit),
      }));

      return;
    }

    if (name === "expiry") {
      let cleaned = value.replace(/\D/g, "").slice(0, 4);

      if (cleaned.length > 2) {
        cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
      }

      setFormData((prev) => ({
        ...prev,
        expiry: cleaned,
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

     
   



  


  const submitHandler = async(e) => {

    e.preventDefault();
    createOrder()

    

    console.log(formData);

  };

  const getCardType = (number) => {
    const cleaned = number.replace(/\s/g, "");

    if (/^4/.test(cleaned)) {
      return "Visa";
    }

    if (/^(5[1-5]|2[2-7])/.test(cleaned)) {
      return "MasterCard";
    }

    if (/^3[47]/.test(cleaned)) {
      return "AmericanExpress";
    }

    return "Unknown";
  };




  return (
    <>
      <form onSubmit={submitHandler} className="">

        <div className="max-w-md p-6 bg-white rounded-xl ">
          <h2 className="text-2xl text-center font-bold mb-6">
            PayPal
          </h2>

          <input
            type="text"
            name="name"
            placeholder="Card Holder Name"
            value={formData.name}
            onChange={changeHandler}
            className="w-full rounded-3xl px-5 border border-slate-200 text-slate-500 py-3  mb-4 outline-none"
          />
          <div className="border rounded-3xl px-5 py-3 border-slate-200 text-slate-500   mb-4 flex justify-between items-center">
            <input
              type="text"
              name="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={formData.cardNumber}
              onChange={changeHandler}
              className="w-full outline-none"
            />





            {cardType === "Visa" && (<span className="text-blue-400">
              <FontAwesomeIcon icon={faCcVisa} className="text-2xl" />


            </span>
            )}

            {cardType === "MasterCard" && (
              <span className="text-black">
                <FontAwesomeIcon icon={faCcMastercard} className="text-2xl" />
              </span>
            )}

            {cardType === "AmericanExpress" && (
              <span className="text-blue-800">
                <FontAwesomeIcon icon={faCcAmex} className="text-2xl" />
              </span>
            )}
            {(!cardType || cardType === "Unknown") && (
              <FaRegCreditCard className="text-xl" />
            )}


          </div>


          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="expiry"
              placeholder="MM/YY"
              value={formData.expiry}
              onChange={changeHandler}
              className="border rounded-3xl px-5  py-3 border-slate-200 text-slate-500  outline-none"
            />

            <input
              type="password"
              name="cvv"
              placeholder={cardType === "American Express" ? "4 Digit CVV" : "3 Digit CVV"}
              value={formData.cvv}
              onChange={changeHandler}
              className="border  border-slate-200 text-slate-500 rounded-3xl px-5  py-3  outline-none"
            />

            <div className="mt-5">
              <p className="text-lg font-semibold text-slate-500">
                Amount: ${Amount}
              </p>
            </div>

          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded"
          >
            Pay Now
          </button>
        </div>

      </form>

    </>


  );
};

export default CheckoutForm;