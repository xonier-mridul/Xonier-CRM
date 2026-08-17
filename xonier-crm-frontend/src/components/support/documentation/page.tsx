"use client";

import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { motion } from "framer-motion";
import {
  FiSearch,
  FiFolder,
  FiCheckSquare,
  FiUsers,
  FiUserCheck,
  FiCreditCard,
  FiCode,
  FiExternalLink,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { AiFillRocket } from "react-icons/ai";
import { DocArticle, DocArticleTranslation } from "@/src/types/support/support.type";

const articleIcons: Record<string, IconType> = {
  gettingStarted: AiFillRocket,
  projects: FiFolder,
  tasks: FiCheckSquare,
  users: FiUsers,
  teams: FiUserCheck,
  billing: FiCreditCard,
  api: FiCode,
};

export default function Documentation() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  // `returnObjects: true` lets i18next give back the nested articles object.
  const rawArticles = t("support.docs.articles", { returnObjects: true }) as Record<
    string,
    DocArticleTranslation
  >;

  const articles: DocArticle[] = useMemo(
    () =>
      Object.entries(rawArticles).map(([id, article]) => ({
        id,
        title: article.title,
        description: article.description,
        href: article.href,
        icon: articleIcons[id] ?? FiFolder,
      })),
    [rawArticles]
  );

  const filtered = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("support.docs.searchPlaceholder") ?? ""}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">{t("support.docs.noResults")}</p>
        )}

        {filtered.map(({ id, title, description, href, icon: Icon }, index) => (
          <motion.a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-cyan-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-700"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Icon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {title}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {description}
              </span>
            </span>
            <FiExternalLink className="shrink-0 text-slate-300 transition-colors group-hover:text-cyan-500" />
          </motion.a>
        ))}
      </div>
    </div>
  );
}