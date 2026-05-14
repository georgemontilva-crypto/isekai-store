import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: "#1e1e1e",
          color: "#f5f5f5",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: "12px 16px",
        },
        classNames: {
          success: "toast-success",
          error: "toast-error",
          title: "toast-title",
          description: "toast-description",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
