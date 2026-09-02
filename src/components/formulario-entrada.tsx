"use client";

/**
 * Formulário da tela de entrada (spec §6.1).
 *
 * Nenhuma chave de fornecedor existe deste lado: este componente só fala com /api/analise.
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cnpjValido, formatarCnpj } from "@/lib/cnpj";

const MODALIDADES = ["capital de giro", "conta garantida", "financiamento de estoque", "CCB"];

export function FormularioEntrada() {
  const router = useRouter();
  const inputArquivos = useRef<HTMLInputElement>(null);

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [valor, setValor] = useState("50000000");
  const [prazo, setPrazo] = useState("24");
  const [modalidade, setModalidade] = useState(MODALIDADES[0]);
  const [dataBase, setDataBase] = useState("2025-12-31");
  const [contrarian, setContrarian] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const completo =
    arquivos.length > 0 &&
    nome.trim().length > 0 &&
    cnpjValido(cnpj) &&
    Number(valor) > 0 &&
    Number(prazo) > 0 &&
    dataBase.length > 0;

  async function enviar(demo: boolean) {
    setEnviando(true);
    setErro(null);

    const form = new FormData();
    form.set("incluir_contrarian", String(contrarian));
    if (demo) {
      form.set("demo", "true");
    } else {
      form.set("nome", nome);
      form.set("cnpj", cnpj);
      form.set("valor_reais", valor);
      form.set("prazo_meses", prazo);
      form.set("modalidade", modalidade);
      form.set("data_base", dataBase);
      for (const a of arquivos) form.append("arquivos", a);
    }

    const r = await fetch("/api/analise", { method: "POST", body: form });
    const corpo = await r.json();
    if (!r.ok) {
      setErro(corpo.erro ?? "não foi possível iniciar a análise");
      setEnviando(false);
      return;
    }
    router.push(`/analise/${corpo.execucao_id}`);
  }

  return (
    <Card className="mt-8">
      <CardContent className="space-y-6 pt-6">
        <div>
          <Label>Demonstrações financeiras</Label>
          <div
            onClick={() => inputArquivos.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setArquivos([...e.dataTransfer.files].slice(0, 5));
            }}
            className="mt-2 cursor-pointer rounded-xl border border-dashed border-border bg-muted/40 px-6 py-8 text-center"
          >
            <Upload className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Arraste até 5 arquivos PDF ou XLSX, de até 20 MB cada, ou clique para escolher.
            </p>
            <input
              ref={inputArquivos}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls"
              className="hidden"
              onChange={(e) => setArquivos([...(e.target.files ?? [])].slice(0, 5))}
            />
          </div>
          {arquivos.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {arquivos.map((a) => (
                <li key={a.name} className="flex items-center gap-2">
                  <FileText className="size-3.5" /> {a.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Nada do que você enviar é gravado. Os arquivos vivem apenas em memória durante a
            execução e são descartados ao fim dela.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nome">Contraparte</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              aria-invalid={cnpj.length > 0 && !cnpjValido(cnpj)}
            />
            {cnpj.length > 0 && !cnpjValido(cnpj) && (
              <p className="mt-1 text-xs text-destructive">dígito verificador não confere</p>
            )}
          </div>
          <div>
            <Label htmlFor="valor">Valor da operação (R$)</Label>
            <Input
              id="valor"
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="prazo">Prazo (meses)</Label>
            <Input
              id="prazo"
              type="number"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="modalidade">Modalidade</Label>
            <select
              id="modalidade"
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
            >
              {MODALIDADES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="data-base">Data-base</Label>
            <Input
              id="data-base"
              type="date"
              value={dataBase}
              onChange={(e) => setDataBase(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <Label htmlFor="contrarian">Incluir revisão contrarian</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Um quarto agente, em outro fornecedor, recebe as três análises e tenta derrubá-las.
              Com ele, a execução faz 7 chamadas; sem ele, 5.
            </p>
          </div>
          <Switch id="contrarian" checked={contrarian} onCheckedChange={setContrarian} />
        </div>

        {erro && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" disabled={!completo || enviando} onClick={() => enviar(false)}>
            {enviando && <Loader2 className="animate-spin" />}
            Executar análise
          </Button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => enviar(true)}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            carregar o caso de demonstração (Grupo Casas Bahia)
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
