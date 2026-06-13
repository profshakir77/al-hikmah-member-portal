import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useGetSettings } from "@workspace/api-client-react";

interface WhatsAppButtonProps {
  phone: string;
  name: string;
  month: number;
  year: number;
  amount?: number | null;
}

export function WhatsAppButton({ phone, name, month, year, amount }: WhatsAppButtonProps) {
  const { data: settings } = useGetSettings();

  const handleSend = () => {
    if (!settings) return;
    
    let template = settings.whatsappAlertTemplate;
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    
    template = template.replace("{name}", name);
    template = template.replace("{month}", monthName);
    template = template.replace("{year}", year.toString());
    template = template.replace("{amount}", amount ? amount.toString() : settings.monthlyDueAmount.toString());

    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(template)}`;
    window.open(url, "_blank");
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSend} disabled={!settings} className="gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700">
      <MessageCircle className="h-4 w-4" />
      Send Alert
    </Button>
  );
}
