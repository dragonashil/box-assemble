"use client";

import { createContext } from "react";
import type { Locale } from "./i18n";

export const LocaleContext = createContext<Locale>("ko");
