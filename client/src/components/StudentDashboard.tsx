import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface StudentDashboardProps {
  studentName: string;
  photoUrl?: string;
  modalidade: string;
  onIrAgenda?: () => void;
}

export default function StudentDashboard({
  studentName,
  photoUrl,
  modalidade,
  onIrAgenda,
}: StudentDashboardProps) {
  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0 flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-4 shadow-sm overflow-hidden w-[180px] h-[180px]">
            <Avatar className="h-28 w-28 mt-1">
              <AvatarImage src={photoUrl} alt={studentName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-nowrap">
            <h1 className="text-2xl font-semibold whitespace-nowrap" data-testid="text-student-name">{studentName}</h1>
            <span className="text-muted-foreground whitespace-nowrap">|</span>
            <p className="text-base text-muted-foreground whitespace-nowrap">{modalidade}</p>
          </div>
          {onIrAgenda && (
            <Button variant="outline" size="sm" className="w-fit ml-2" onClick={onIrAgenda} data-testid="button-agenda-professor">
              <Calendar className="h-4 w-4 mr-2" />
              Agenda
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
