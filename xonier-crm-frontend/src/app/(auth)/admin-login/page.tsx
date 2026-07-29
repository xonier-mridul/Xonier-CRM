"use client"
import FormButton from '@/src/components/ui/FormButton'
import Input from '@/src/components/ui/Input'
import { AuthService } from '@/src/services/auth.service'
import { AdminLogin } from '@/src/types'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, ShieldCheck } from 'lucide-react'

const Page = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  const [formData, setFormData] = useState<AdminLogin>({
    email: "",
    password: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (error) setError("")
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const result = await AuthService.adminLogin(formData)

      if (result.status == 200) {
        sessionStorage.setItem("Email ", formData.email)
        sessionStorage.setItem("Password ", formData.password)
        router.push('/admin/login/verify-otp')
      }
    } catch (error) {
      console.log("err i admin login :", error)
      setError(t("login_failed_message") || "Login failed. Please check your credentials and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-cyan-50/2 via-cyan-50 to-cyan-100 flex flex-col lg:flex-row">
      
      {/* Left Section - Branding & Illustration */}
      <div className="w-full lg:w-[65%] flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10">
        <nav className="mb-6 lg:mb-0">
          <Image
            src={"/images/trakeroo.png"}
            height={200}
            width={200}
            alt={t("xonier_logo")}
            className="w-32 sm:w-36"
            priority
          />
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-6 lg:mt-0">
          <Image
            src={"/images/login-security.svg"}
            height={550}
            width={550}
            alt="Admin dashboard illustration"
            className="w-full max-w-md lg:max-w-xl h-auto"
            priority
          />
          <div className="text-center max-w-md hidden lg:block">
            <h2 className="text-xl font-semibold text-cyan-900">
              {t("manage_your_platform") || "Manage your platform with ease"}
            </h2>
            <p className="text-cyan-700/70 mt-2 text-sm">
              {t("admin_panel_subtitle") || "Secure access for administrators to monitor, control, and configure the system."}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[35%] flex items-center justify-center bg-white px-6 sm:px-10 py-12 lg:py-0 lg:rounded-l-3xl lg:shadow-sm">
        <div className="w-full max-w-sm">

          <div className="flex flex-col items-center lg:items-start mb-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 flex items-center justify-center mb-4">
              <ShieldCheck className="w-7 h-7 text-cyan-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl text-gray-900 font-bold text-center lg:text-left">
              {t("welcome_back_admin")}
            </h1>
            <p className="text-sm text-gray-500 mt-2 text-center lg:text-left">
              {t("login_subtitle") || "Sign in to access the admin dashboard"}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            <div className="mt-2">
              <FormButton
                isLoading={isLoading}
                disabled={formData.email === "" || formData.password === ""}
              >
                {t("sign_in")}
              </FormButton>
            </div>
          </form>

          <p className="text-xs text-gray-400 text-center mt-10">
            {t("secure_admin_access") || "This is a restricted area. Unauthorized access is prohibited."}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Page