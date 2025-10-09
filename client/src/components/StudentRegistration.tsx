import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload } from "lucide-react";

interface StudentRegistrationProps {
  onRegister: (data: any) => void;
  onCancel: () => void;
}

export default function StudentRegistration({
  onRegister,
  onCancel,
}: StudentRegistrationProps) {
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    senha: "",
    modalidade: "",
    plano: "",
    foto: "",
    compromisso: false,
  });

  const [previewFoto, setPreviewFoto] = useState<string>("");

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewFoto(reader.result as string);
        setFormData({ ...formData, foto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const canSubmit =
    formData.nome &&
    formData.cpf &&
    formData.senha &&
    formData.modalidade &&
    formData.plano &&
    formData.compromisso;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Cadastro de Aluno</CardTitle>
          <CardDescription>
            Preencha seus dados para começar a treinar na Arena MUV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={previewFoto} />
                <AvatarFallback className="bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <Input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFotoChange}
                data-testid="input-photo-upload"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              data-testid="input-cpf"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              data-testid="input-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modalidade">Modalidade</Label>
            <Select
              value={formData.modalidade}
              onValueChange={(value) =>
                setFormData({ ...formData, modalidade: value })
              }
            >
              <SelectTrigger data-testid="select-modality">
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beach Tennis">Beach Tennis</SelectItem>
                <SelectItem value="Vôlei de Praia">Vôlei de Praia</SelectItem>
                <SelectItem value="Futevôlei">Futevôlei</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plano">Plano de Frequência</Label>
            <Select
              value={formData.plano}
              onValueChange={(value) => setFormData({ ...formData, plano: value })}
            >
              <SelectTrigger data-testid="select-plan">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">
                  <div className="flex flex-col">
                    <span className="font-medium">8 Check-ins - 1x por semana</span>
                    <span className="text-xs text-muted-foreground">Ciclo de 30 dias</span>
                  </div>
                </SelectItem>
                <SelectItem value="12">
                  <div className="flex flex-col">
                    <span className="font-medium">12 Check-ins - 2x por semana</span>
                    <span className="text-xs text-muted-foreground">Ciclo de 30 dias</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha a frequência que melhor se adapta à sua rotina
            </p>
          </div>

          <div className="flex items-start space-x-2 rounded-md border p-4">
            <Checkbox
              id="compromisso"
              checked={formData.compromisso}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, compromisso: checked as boolean })
              }
              data-testid="checkbox-commitment"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="compromisso"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Aceito o compromisso
              </label>
              <p className="text-sm text-muted-foreground">
                Comprometo-me a completar {formData.plano || "os"} check-ins dentro do
                ciclo de 30 dias, conforme o plano escolhido.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!canSubmit}
              onClick={() => onRegister(formData)}
              data-testid="button-register"
            >
              Cadastrar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
