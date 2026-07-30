"use client";
import React, { useState, useEffect, FormEvent } from "react";

import Image from "next/image";
import { LoginPayload } from "@/src/types";
import Input from "@/src/components/ui/Input";
import Link from "next/link";
import FormButton from "@/src/components/ui/FormButton";
import { AuthService } from "@/src/services/auth.service";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import extractErrorMessages from "../../utils/error.utils";
import { useTranslation } from "react-i18next";

const page = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<any | null>(null);
  const [formData, setFormData] = useState<LoginPayload>({
    email: "",
    password: "",
    companyId:""
  });

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErr(null);
    try {
      const result = await AuthService.login(formData);
      if (result.status === 200) {
        router.push("/login/verify-otp");
        sessionStorage.setItem("loginMail", formData.email);
        sessionStorage.setItem("companyId", formData.companyId);
        sessionStorage.setItem("loginPassword", formData.password);
        setFormData({ email: "", password: "" ,companyId:""});
        toast.success(result.data.message);
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

  return (
    <div className="min-h-screen flex items-start justify-center bg-cyan-50">
      <div className="w-[65%] mt-7 mx-11 flex flex-col justify-center ">
        <nav>
          <Image
            src={"/images/trakeroo.png"}
            height={200}
            width={200}
            alt={t("xonier_logo")}
            className="w-36"
          />
        </nav>
        <div className="flex items-center justify-center">
          <Image
            src={"/images/login-security.svg"}
            height={600}
            width={600}
            alt=""
          />
        </div>
      </div>
      <div className="w-[35%] bg-white h-screen flex items-start justify-center flex-col gap-5 p-14">
        <h1 className="text-2xl text-black font-medium">{t("welcome_back_admin")}</h1>
        {/* <div className="flex flex-col gap-2 text-gray-500">
          Continue with
          <div className="flex items-center justify-between gap-3 w-full">
            <button className="flex items-center justify-center gap-2 text-black/90 rounded-sm border-[1px] border-gray-200 p-2.5 px-6">
              {" "}
              <Image
                src={"/images/google-icon.svg"}
                height={20}
                width={20}
                alt="google icon"
              />{" "}
              with Google
            </button>
            <button className="flex items-center justify-center gap-2 text-black/90 rounded-sm border-[1px] border-gray-200 p-2.5 px-6">
              {" "}
              <Image
                src={"/images/facebook-icon.png"}
                height={20}
                width={20}
                alt="google icon"
              />{" "}
              with Facebook
            </button>
          </div>
        </div> */}
        {/* <div className="flex items-center justify-center gap-3 w-full">
          <span className="w-full border-b-1 border-gray-100"></span>
          <h5 className="text-black w-80 text-center">or sign in with</h5>
          <span className="w-full border-b-1 border-gray-100"></span>
        </div> */}

        <form className="w-full " onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <Input
              label={t("email")}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t("example_gmail_com")}
            />
            <Input
              label={t("password_2")}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="*********"
            />
             <Input
              label={t("company_id")}
              name="companyId"
              type="text"
              value={formData.companyId}
              onChange={handleChange}
              placeholder="COMP6-2026........."
            />
            <div className="flex items-center justify-end">
              <Link href={"/forgot-password"} className="text-gray-500 font-semibold text-sm">
                {t("forgot_password")}
              </Link>
            </div>
             <div className="flex items-center justify-end">
              <Link href={"/forgot-companyId"} className="text-gray-500 font-semibold text-sm">
                {t("forgot_companyId")}
              </Link>
            </div>
            {err && (
              <div className="flex justify-end items-center">
                {" "}
                <p className="text-red-500">{err}</p>{" "}
              </div>
            )}
            <FormButton
              isLoading={isLoading}
              disabled={formData.email === "" || formData.password === ""}
            >
              {t("sign_in")}
            </FormButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default page;
