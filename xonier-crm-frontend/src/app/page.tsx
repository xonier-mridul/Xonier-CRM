import ThemeToggle from "@/src/components/common/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-pink- dark:bg-gray-800">
      <ThemeToggle />
      <h1 className="text-red-500 dark:text-red-300">
       Welcome to the xonier CRM
      </h1>
    </div>
  );
}
