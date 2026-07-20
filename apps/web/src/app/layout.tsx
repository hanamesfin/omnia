import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppearanceProvider } from "@/components/AppearanceProvider";

/**
 * Serif + mono load from Google; system/OpenDyslexic via CSS stacks.
 * Appearance sets --omnia-font-stack so UI chrome picks up font family.
 */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const apiOrigin = (() => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "http://localhost:8000";
  }
})();

/** Prevents theme + appearance flash before React hydrates. */
const themeBootstrap = `(function(){try{var k='omnia-theme';var t=localStorage.getItem(k);var ok=['dark','light','midnight','aurora','ember','ocean','graphite','dusk','frost','citric'];if(ok.indexOf(t)===-1)t='light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=(t==='light'||t==='frost')?'light':'dark';var a=localStorage.getItem('omnia-appearance');var p=a?JSON.parse(a):{};var legacyFs={'sm':0.875,'default':1,'lg':1.125,'xl':1.22};var fs=p.fontScale;if(typeof fs!=='number'){fs=typeof p.fontSize==='string'&&legacyFs[p.fontSize]!=null?legacyFs[p.fontSize]:1;}if(fs<0.5)fs=0.5;if(fs>2.5)fs=2.5;document.documentElement.style.setProperty('--omnia-font-scale',String(fs));var stacks={system:'"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",var(--font-body),system-ui,sans-serif',serif:'var(--font-serif),"Iowan Old Style",Palatino,Georgia,serif',mono:'var(--font-mono),"SF Mono",ui-monospace,Menlo,monospace',dyslexic:'OpenDyslexic,"OpenDyslexic Regular","Comic Sans MS",system-ui,sans-serif'};var ff=p.fontFamily||'system';if(!stacks[ff])ff='system';document.documentElement.setAttribute('data-font-family',ff);document.documentElement.style.setProperty('--omnia-font-stack',stacks[ff]);var legacyD={'compact':0.5,'comfortable':1,'spacious':1.75};var ds=p.densityScale;if(typeof ds!=='number'){ds=typeof p.messageDensity==='string'&&legacyD[p.messageDensity]!=null?legacyD[p.messageDensity]:1;}if(ds<0.25)ds=0.25;if(ds>3)ds=3;var r=document.documentElement;r.style.setProperty('--omnia-density-scale',String(ds));r.style.setProperty('--chat-turn-gap','calc(1.25rem * '+ds+')');r.style.setProperty('--chat-bubble-pad-x','calc(1rem * '+ds+')');r.style.setProperty('--chat-bubble-pad-y','calc(0.75rem * '+ds+')');r.style.setProperty('--chat-row-gap','calc(0.75rem * '+ds+')');r.setAttribute('data-density',String(ds));r.setAttribute('data-message-style',p.messageStyle||'bubble');r.setAttribute('data-sidebar-layout',p.sidebarLayout||'expanded');r.setAttribute('data-sidebar-pin',p.sidebarPin||'pinned');r.setAttribute('data-reduce-motion',p.reduceMotion?'true':'false');var w=typeof p.sidebarWidth==='number'?p.sidebarWidth:280;if(w<200)w=200;if(w>360)w=360;r.style.setProperty('--sidebar-width',w+'px');r.style.setProperty('--sidebar-collapsed-width','72px');}catch(e){var d=document.documentElement;d.setAttribute('data-theme','light');d.style.colorScheme='light';d.style.setProperty('--omnia-font-scale','1');d.style.setProperty('--omnia-density-scale','1');d.style.setProperty('--chat-turn-gap','1.25rem');d.style.setProperty('--chat-bubble-pad-x','1rem');d.style.setProperty('--chat-bubble-pad-y','0.75rem');d.style.setProperty('--chat-row-gap','0.75rem');d.setAttribute('data-font-family','system');d.setAttribute('data-message-style','bubble');d.setAttribute('data-sidebar-layout','expanded');d.setAttribute('data-sidebar-pin','pinned');d.setAttribute('data-reduce-motion','false');d.style.setProperty('--sidebar-width','280px');}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OMNIA — Adaptive AI Agent Creation",
    template: "%s · OMNIA",
  },
  description:
    "Describe what you need. OMNIA designs, generates, evaluates, and improves the agent — with transparent algorithms, not a black box.",
  applicationName: "OMNIA",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "OMNIA",
    title: "OMNIA — Adaptive AI Agent Creation",
    description:
      "Describe what you need. OMNIA designs, generates, evaluates, and improves the agent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OMNIA — Adaptive AI Agent Creation",
    description:
      "Describe what you need. OMNIA designs, generates, evaluates, and improves the agent.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${mono.variable} ${serif.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <link rel="dns-prefetch" href={apiOrigin} />
        <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/opendyslexic@0.91.12/opendyslexic.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-field h-screen overflow-hidden font-body antialiased">
        <ThemeProvider>
          <AppearanceProvider>
            <I18nProvider>
              <AppShell>{children}</AppShell>
            </I18nProvider>
          </AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
