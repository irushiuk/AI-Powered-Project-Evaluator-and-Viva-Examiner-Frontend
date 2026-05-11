"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

import { CheckCircle2, AlertCircle } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-gray-200 shadow-lg text-base",
          title: "group-[.toast]:font-medium text-[15px]",
          description: "group-[.toast]:text-gray-500 text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error:
            "group toast group-[.toaster]:bg-red-500 group-[.toaster]:text-white group-[.toaster]:border-red-600",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-100" />,
        error: <AlertCircle className="h-5 w-5 text-white" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
