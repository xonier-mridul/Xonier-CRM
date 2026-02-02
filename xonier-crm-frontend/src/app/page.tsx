import ThemeToggle from "@/src/components/common/ThemeToggle";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
            <Image width={200} height={200} src={"/images/trakeroo-light.png"} alt="logo" className="hidden dark:block"/>
            <Image width={200} height={200} src={"/images/trakeroo.png"} alt="logo" className="dark:hidden "/>
          </span>
          
        </div>

        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Badge */}
        <span className="mb-4 inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900/40 px-4 py-1 text-sm font-medium text-teal-700 dark:text-teal-300">
          🚀 Smart CRM for modern teams
        </span>

        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
            Trakeroo CRM
          </span>
        </h1>


        <p className="mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Manage leads, roles, users, and permissions with clarity and control.
          Built for performance, security, and scalability.
        </p>


        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href={"/dashboard"} className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-violet-700 transition">
            Go to Dashboard
          </Link>

          <button className="rounded-xl border border-gray-300 dark:border-gray-600 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            Learn More
          </button>
        </div>


        <div className="mt-20 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Role Based Access",
              desc: "Granular permissions and secure role management.",
            },
            {
              title: "Lead & Enquiry Tracking",
              desc: "Track enquiries from source to conversion.",
            },
            {
              title: "Modern UI",
              desc: "Fast, responsive, and dark-mode friendly.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-left shadow-sm hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Trakeroo CRM. Developed by <Link className="text-teal-700 dark:text-teal-200 hover:text-teal-800 dark:hover:text-teal-300" href={"https://xoniertechnologies.com"} target="_blank">Xonier Technologies</Link>
      </footer>
    </div>
  );
}
