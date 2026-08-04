import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";

function GlobalSupportWhatsappSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let supportWhatsapp = "";

    const buildMessage = (originalHref: string) => {
      const match = originalHref.match(/\?text=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : "Preciso de suporte";
    };

    const applyWhatsappLinks = () => {
      if (!supportWhatsapp) return;
      const phone = supportWhatsapp.replace(/\D/g, "");
      if (!phone) return;

      document.querySelectorAll<HTMLAnchorElement>("a[href*='wa.me']").forEach((anchor) => {
        const message = buildMessage(anchor.href);
        anchor.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      });
    };

    fetch("/api/settings/public", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        supportWhatsapp = typeof data?.support_whatsapp === "string" ? data.support_whatsapp : "";
        applyWhatsappLinks();
      })
      .catch(() => undefined);

    const observer = new MutationObserver(() => applyWhatsappLinks());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

// Helper for protected routes
function ProtectedRoute({ component: Component, adminOnly = false, requiredTool, ...rest }: any) {
  const { user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else if (adminOnly && !isAdmin) {
        setLocation("/dashboard");
      } else if (!isAdmin && requiredTool) {
        const perms = user.permissions 
          ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions)
          : { ferramentas: [] };
        if (!perms.ferramentas?.includes(requiredTool)) {
          setLocation("/dashboard");
        }
      }
    }
  }, [user, loading, isAdmin, adminOnly, requiredTool, setLocation]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!user || (adminOnly && !isAdmin)) return null;
  
  if (!isAdmin && requiredTool) {
    const perms = user.permissions 
      ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions)
      : { ferramentas: [] };
    if (!perms.ferramentas?.includes(requiredTool)) return null;
  }

  return <Component {...rest} />;
}

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AtestadoCria from "./pages/AtestadoCria";
import AtestadoView from "./pages/AtestadoView";
import Validation from "./pages/Validation";
import CNHCria from "./pages/CNHCria";
import CHACria from "./pages/CHACria";
import ToxicriaCria from "./pages/ToxicriaCria";
import ToxicriaSalvos from "./pages/ToxicriaSalvos";
import HistoricoSP from "./pages/HistoricoSP";
import HistoricoCria from "./pages/HistoricoCria";
import HistoricoEditar from "./pages/HistoricoEditar";
import AdminDashboard from "./pages/AdminDashboard";
import ReceitaCria from "./pages/ReceitaCria";
import AtestadoEditar from "./pages/AtestadoEditar";
import ReceitaEditar from "./pages/ReceitaEditar";
import CNHEditar from "./pages/CNHEditar";
import CHAEditar from "./pages/CHAEditar";
import ValidationReceita from "./pages/ValidationReceita";
import Extrato from "./pages/Extrato";
import Recargas from "./pages/Recargas";
import Configuracoes from "./pages/Configuracoes";
import Indicacoes from "./pages/Indicacoes";
import NotFound from "./pages/NotFound";

// Páginas Salvas
import CNHSalvas from "./pages/CNHSalvas";
import AtestadosSalvos from "./pages/AtestadosSalvos";
import CHASalvas from "./pages/CHASalvas";
import ReceitasSalvas from "./pages/ReceitasSalvas";

import HistoricoSPSalvos from "./pages/HistoricoSPSalvos";
import HistoricoUNINTERSalvos from "./pages/HistoricoUNINTERSalvos";
import PeticaoCria from "./pages/PeticaoCria";
import PeticaoSalvos from "./pages/PeticaoSalvos";
import JudicialSearch from "./pages/JudicialSearch";
import JudicialDetails from "./pages/JudicialDetails";
import JudicialHistory from "./pages/JudicialHistory";
import JudicialOabDetails from "./pages/JudicialOabDetails";
import DiplomaUninterCria from "./pages/DiplomaUninterCria";
import CNHLanding from "./pages/cnh-validation/CNHLanding";
import Consultas from "./pages/Consultas";

import CNHAutorizacao from "./pages/cnh-validation/CNHAutorizacao";
import CNHPainel from "./pages/cnh-validation/CNHPainel";
import CNHCondutor from "./pages/cnh-validation/CNHCondutor";
import CNHHabilitacao from "./pages/cnh-validation/CNHHabilitacao";

import CertificadoFGVCria from "./pages/CertificadoFGVCria";
import BrasilOpenBadgeValidation from "./pages/BrasilOpenBadgeValidation";

// ─── Detectar Domínio ──────────────────────────────────────────────────────────
const isValidationDomain = typeof window !== 'undefined' && 
  (window.location.hostname === 'validaratestado.digital' || 
   window.location.hostname === 'www.validaratestado.digital');

const isVerificaMedDomain = typeof window !== 'undefined' &&
  (window.location.hostname === 'verificamed.digital' ||
   window.location.hostname === 'www.verificamed.digital');

const isCNHValidationDomain = typeof window !== 'undefined' &&
  (window.location.hostname === 'carteira-digital-transito-vio.digital' ||
   window.location.hostname === 'www.carteira-digital-transito-vio.digital');

const isBrasilOpenBadgeDomain = typeof window !== 'undefined' &&
  (window.location.hostname.includes('brasilopenbadge') ||
   window.location.hostname === 'brasilopenbadge.dev' ||
   window.location.hostname === 'www.brasilopenbadge.dev' ||
   window.location.pathname.startsWith('/pages/badge/') ||
   window.location.pathname.startsWith('/badge/'));

// ─── Roteador para verificamed.digital (Validação de Receitas) ───────────────────
function VerificaMedRouter() {
  return (
    <Switch>
      <Route path="/verificar/receita/:id" component={ValidationReceita} />
      <Route path="/verificar-receita/:id" component={ValidationReceita} />
      <Route path="/verificar/:id" component={ValidationReceita} />
      <Route path="/" component={ValidationReceita} />
      
      {/* Captura códigos diretos RX-XXXX-XXXX ou qualquer outra rota */}
      <Route path="/:id" component={ValidationReceita} />
      
      {/* Fallback universal para o domínio de receitas */}
      <Route component={ValidationReceita} />
    </Switch>
  );
}

// ─── Roteador para carteira-digital-transito-vio.digital (Validação CNH) ──────
function CNHValidationRouter() {
  return (
    <Switch>
      <Route path="/autorizacao" component={CNHAutorizacao} />
      <Route path="/painel" component={CNHPainel} />
      <Route path="/condutor" component={CNHCondutor} />
      <Route path="/habilitacao" component={CNHHabilitacao} />
      <Route path="/verificar/:id" component={Validation} />
      <Route path="/" component={CNHLanding} />
      
      {/* Captura códigos diretos ou rotas não mapeadas */}
      <Route path="/:id" component={CNHLanding} />
      
      {/* Fallback universal para o domínio de CNH */}
      <Route component={CNHLanding} />
    </Switch>
  );
}

// ─── Roteador para brasilopenbadge (Validação de Certificados/Badges) ───────────
function BrasilOpenBadgeRouter() {
  return (
    <Switch>
      <Route path="/pages/badge/:id" component={BrasilOpenBadgeValidation} />
      <Route path="/badge/:id" component={BrasilOpenBadgeValidation} />
      <Route path="/:id" component={BrasilOpenBadgeValidation} />
      <Route component={BrasilOpenBadgeValidation} />
    </Switch>
  );
}

// ─── Roteador para validaratestado.digital (Apenas Validação) ──────────────────
function ValidationRouter() {
  return (
    <Switch>
      <Route path="/validar" component={Validation} />
      <Route path="/v/:id" component={Validation} />
      <Route path="/verificar/atestado/:id" component={Validation} />
      <Route path="/verificar/:id" component={Validation} />
      <Route path="/" component={Validation} />
      
      {/* Captura códigos diretos XXXX.XXXX ou qualquer outra rota não mapeada */}
      <Route path="/:id" component={Validation} />
      
      {/* Fallback universal para o domínio de validação: Sempre mostrar Validation */}
      <Route component={Validation} />
    </Switch>
  );
}

// ─── Roteador para docmaster.store (Painel Completo) ─────────────────────────────
function DocMasterRouter() {
  return (
    <Switch>
      {/* Landing page pública */}
      <Route path="/" component={Home} />

      {/* Autenticação */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Painel principal */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>

      {/* Área de Consultas SnoopIntelligence */}
      <Route path="/consultas">
        <ProtectedRoute component={Consultas} />
      </Route>

      {/* Emissão de documentos - slugs principais */}
      <Route path="/atestado">
        <ProtectedRoute component={AtestadoCria} />
      </Route>
      <Route path="/atestado/editar/:id">
        {(params) => <ProtectedRoute component={AtestadoEditar} params={params} />}
      </Route>
      <Route path="/atestadosalvos">
        <ProtectedRoute component={AtestadosSalvos} />
      </Route>

      <Route path="/cnh">
        <ProtectedRoute component={CNHCria} />
      </Route>
      <Route path="/cnh/editar/:id">
        {(params) => <ProtectedRoute component={CNHEditar} params={params} />}
      </Route>
      <Route path="/cnhsalvas">
        <ProtectedRoute component={CNHSalvas} />
      </Route>

      <Route path="/cha">
        <ProtectedRoute component={CHACria} />
      </Route>
      <Route path="/cha/editar/:id">
        {(params) => <ProtectedRoute component={CHAEditar} params={params} />}
      </Route>
      <Route path="/chasalvas">
        <ProtectedRoute component={CHASalvas} />
      </Route>

      {/* Laudo Sodré */}
      <Route path="/toxicria">
        <ProtectedRoute component={ToxicriaCria} />
      </Route>
      <Route path="/toxicriasalvos">
        <ProtectedRoute component={ToxicriaSalvos} />
      </Route>

      {/* Rotas legacy */}
      <Route path="/atestadocria">
        <ProtectedRoute component={AtestadoCria} />
      </Route>
      <Route path="/cnhcria">
        <ProtectedRoute component={CNHCria} />
      </Route>
      <Route path="/chacria">
        <ProtectedRoute component={CHACria} />
      </Route>

      {/* Receituário Médico */}
      <Route path="/receita">
        <ProtectedRoute component={ReceitaCria} />
      </Route>
      <Route path="/receitacria">
        <ProtectedRoute component={ReceitaCria} />
      </Route>
      <Route path="/receita/editar/:id">
        {(params) => <ProtectedRoute component={ReceitaEditar} params={params} />}
      </Route>
      <Route path="/receitassalvas">
        <ProtectedRoute component={ReceitasSalvas} />
      </Route>

      {/* Históricos */}
      <Route path="/historico/atestados">
        <ProtectedRoute component={AtestadoCria} />
      </Route>
      <Route path="/historico/atestados/:id">
        {(params) => <ProtectedRoute component={AtestadoView} params={params} />}
      </Route>
      <Route path="/historico-sp">
        <ProtectedRoute component={HistoricoSP} />
      </Route>
      <Route path="/historico-sp-salvos">
        <ProtectedRoute component={HistoricoSPSalvos} />
      </Route>
      <Route path="/historicocria">
        <ProtectedRoute component={HistoricoCria} />
      </Route>
      <Route path="/historicocria/editar/:id">
        {(params) => <ProtectedRoute component={HistoricoEditar} params={params} />}
      </Route>
      <Route path="/historico-uninter-salvos">
        <ProtectedRoute component={HistoricoUNINTERSalvos} />
      </Route>

      <Route path="/peticaocria">
        <ProtectedRoute component={PeticaoCria} requiredTool="bot-adv" />
      </Route>
      <Route path="/peticaocria-salvos">
        <ProtectedRoute component={PeticaoSalvos} requiredTool="bot-adv" />
      </Route>

      {/* Consulta de Processos Judiciais */}
      <Route path="/bot-adv/historico">
        <ProtectedRoute component={JudicialHistory} requiredTool="bot-adv" />
      </Route>
      <Route path="/bot-adv/oab/:uf/:oab">
        <ProtectedRoute component={JudicialOabDetails} requiredTool="bot-adv" />
      </Route>
      <Route path="/bot-adv/:id">
        {(params) => <ProtectedRoute component={JudicialDetails} params={params} requiredTool="bot-adv" />}
      </Route>
      <Route path="/bot-adv">
        <ProtectedRoute component={JudicialSearch} requiredTool="bot-adv" />
      </Route>

      <Route path="/diplomaunintercria">
        <ProtectedRoute component={DiplomaUninterCria} />
      </Route>

      <Route path="/certificado-fgv">
        <ProtectedRoute component={CertificadoFGVCria} />
      </Route>
      <Route path="/certificado-fgv/editar/:id">
        {(params) => <ProtectedRoute component={CertificadoFGVCria} params={params} />}
      </Route>

      {/* Financeiro */}
      <Route path="/extrato">
        <ProtectedRoute component={Extrato} />
      </Route>
      <Route path="/recargas">
        <ProtectedRoute component={Recargas} />
      </Route>

      {/* Configurações do usuário */}
      <Route path="/configuracoes">
        <ProtectedRoute component={Configuracoes} />
      </Route>

      {/* Indicações */}
      <Route path="/indicacoes">
        <ProtectedRoute component={Indicacoes} />
      </Route>

      {/* Administração */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} adminOnly={true} />
      </Route>

      {/* Validação pública de documentos */}
      <Route path="/validar" component={Validation} />
      <Route path="/v/:id" component={Validation} />
      <Route path="/:id" component={(props: { params: { id: string } }) => {
        const id = props.params?.id || "";
        if (/^[A-Z0-9]{4}\.[A-Z0-9]{4}$/i.test(id)) {
          return <Validation />;
        }
        return <NotFound />;
      }} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isVal = isValidationDomain || isVerificaMedDomain || isCNHValidationDomain || isBrasilOpenBadgeDomain;
      
      if (isVal) {
        document.body.classList.add('is-validation-page');
        document.title = isValidationDomain 
          ? "Validação Oficial" 
          : isVerificaMedDomain 
            ? "VerificaMed" 
            : isCNHValidationDomain 
              ? "Carteira Digital"
              : "Brasil Open Badge";
      } else {
        document.body.classList.remove('is-validation-page');
        // Apenas setar DocMaster se NÃO for um domínio de validação
        if (!isVal) document.title = "DocMaster";
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <GlobalSupportWhatsappSync />
            {isCNHValidationDomain
              ? <CNHValidationRouter />
              : isVerificaMedDomain
                ? <VerificaMedRouter />
                : isValidationDomain
                  ? <ValidationRouter />
                  : isBrasilOpenBadgeDomain
                    ? <BrasilOpenBadgeRouter />
                    : <DocMasterRouter />
            }
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
