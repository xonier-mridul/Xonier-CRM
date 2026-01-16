"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { IoChevronBack } from "react-icons/io5";
import { useDispatch, UseDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/src/store";
import FormButton from "@/src/components/ui/FormButton";
import { AuthService } from "@/src/services/auth.service";
import { ResendLoginOtpPayload, VerifyLoginOtpPayload } from "@/src/types";
import { login, logout } from "@/src/store/slices/authSlice";

import extractErrorMessages from "@/src/app/utils/error.utils";

const OTP_LENGTH = 6;
const OTP_TIMER = 60;

const page = () => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResetLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(OTP_TIMER);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const userEmail = sessionStorage.getItem("loginMail");
    const userPassword = sessionStorage.getItem("loginPassword");
    if (userEmail) setEmail(userEmail);
    if (userPassword) setPassword(userPassword);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const dispatch = useDispatch<AppDispatch>()

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const otpArray = otp.split("");
    otpArray[index] = value;

    const newOtp = otpArray.join("").slice(0, OTP_LENGTH);
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    setOtp(pasted);
    inputRefs.current[pasted.length - 1]?.focus();
  };

  const verifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (otp.length !== OTP_LENGTH) {
      toast.error("Please enter 6 digit OTP");
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const payload: VerifyLoginOtpPayload = {
        email,
        otp: Number(otp),
        password,
      };

      const result = await AuthService.verifyLoginOtp(payload);

      if (result.status === 200) {
        toast.success("Logged in successfully");
        sessionStorage.removeItem("loginMail");
        sessionStorage.removeItem("loginPassword");
        router.push("/dashboard")
        dispatch(login(result.data.data))
      }
    } catch (error: unknown) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErrors(messages);
      } else {
        setErrors(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setResetLoading(true);
    try {
      if (!email || !password) {
        setErrors([
          "Email and password not found, please back to login form and try again",
        ]);
      }

      const payload: ResendLoginOtpPayload = {
        email,
        password,
      };

      const result = await AuthService.resendOTP(payload);
      if (result.status === 200) {
        toast.success("Verification OTP send successfully");
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErrors(messages);
      } else {
        setErrors(["Something went wrong"]);
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-violet-50 min-h-screen">
      <div className="bg-white p-8 rounded-xl w-[600px] flex flex-col gap-5">
        <h1 className="text-2xl font-semibold text-blue-800">
          Verify Login OTP
        </h1>

        <p className="text-sm text-gray-500">
          OTP is sent to{" "}
          <span className="font-medium text-blue-500">{email}</span>
        </p>

        <form onSubmit={verifyOtp} className="flex flex-col gap-7">
          <div className="flex gap-3 justify-between">
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otp[index] || ""}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="
                  w-16 h-14 text-center text-lg font-semibold
                  border border-slate-400 text-slate-800
                  rounded-md focus:ring-2 focus:ring-blue-500
                "
              />
            ))}
          </div>

          {errors.length > 0 && (
            <div className="text-red-500 text-sm text-center">
              {errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}

          <FormButton isLoading={isLoading}>Verify OTP</FormButton>
        </form>

        <div className="text-center text-sm text-gray-600">
          {timeLeft > 0 ? (
            <p>
              Resend OTP in{" "}
              <span className="font-semibold text-blue-600">{timeLeft}s</span>
            </p>
          ) : (
            <button
              onClick={resendOtp}
              className="text-blue-600 font-medium hover:underline"
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>

        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer hover:text-blue-400 tracking-wide"
        >
          <IoChevronBack /> Step Back
        </button>
      </div>
    </div>
  );
};

export default page;
