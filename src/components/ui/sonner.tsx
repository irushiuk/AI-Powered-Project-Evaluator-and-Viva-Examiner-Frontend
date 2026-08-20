"use client"

import { Toaster as Sonner } from "sonner"
import Image from "next/image"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
      toastOptions={{
        classNames: {
          toast:
            "!bg-[#E8F5F1] !text-[#0A9B78] !border-l-4 !border-l-[#0A9B78] !border-t-0 !border-r-0 !border-b-0 shadow-lg rounded-lg p-4 !font-[family-name:var(--font-poppins)]",
          title: "!text-[#0A9B78] text-sm font-normal !font-[family-name:var(--font-poppins)] !m-0",
          description: "!text-[#0A9B78] text-sm font-normal !font-[family-name:var(--font-poppins)] !m-0 !mt-1",
          actionButton:
            "!bg-primary !text-primary-foreground !font-[family-name:var(--font-poppins)]",
          cancelButton:
            "!bg-muted !text-muted-foreground !font-[family-name:var(--font-poppins)]",
          error:
            "!bg-[#FDEBEC] !text-[#E31B23] !border-l-4 !border-l-[#E31B23] !border-t-0 !border-r-0 !border-b-0 shadow-lg rounded-lg p-4 !font-[family-name:var(--font-poppins)] [&_[data-title]]:!text-[#E31B23] [&_[data-description]]:!text-[#E31B23]",
        },
      }}
      icons={{
        success: (
          <Image
            src="/images/success-icon.svg"
            alt="Success"
            width={24}
            height={24}
            className="shrink-0"
          />
        ),
        error: (
          <Image
            src="/images/error-icon.svg"
            alt="Error"
            width={24}
            height={24}
            className="shrink-0"
          />
        ),
      }}
      {...props}
    />
  )
}

export { Toaster }
