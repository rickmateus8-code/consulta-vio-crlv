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
function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else if (adminOnly && !isAdmin) {
        setLocation("/dashboard");
      }
    }
  }, [user, loading, isAdmin, adminOnly, setLocation]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!user || (adminOnly && !isAdmin)) return null;

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
import AdminDashboard from "./pages/AdminDashboard";
import ReceitaCria from "./pages/ReceitaCria";
import AtestadoEditar from "./pages/AtestadoEditar";
import ReceitaEditar from "./pages/ReceitaEditar";
import CNHEditar from "./pages/CNHEditar";
import CHAEditar from "./pages/CHAEditar";
import HistoricoEditar from "./pages/HistoricoEditar";
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
import CRLVCria from "./pages/CRLVCria";
import CRLVSalvos from "./pages/CRLVSalvos";

import HistoricoSPSalvos from "./pages/HistoricoSPSalvos";
import HistoricoUNINTERSalvos from "./pages/HistoricoUNINTERSalvos";
import PeticaoCria from "./pages/PeticaoCria";
import PeticaoSalvos from "./pages/PeticaoSalvos";
import Consultas from "./pages/Consultas";
import ValidationPeticao from "./pages/ValidationPeticao";
import JudicialSearch from "./pages/JudicialSearch";
import JudicialDetails from "./pages/JudicialDetails";
import JudicialHistory from "./pages/JudicialHistory";
import DiplomaUninterCria from "./pages/DiplomaUninterCria";
import CNHLanding from "./pages/cnh-validation/CNHLanding";
import UniversalStudioPage from "./pages/UniversalStudioPage";

import CNHAutorizacao from "./pages/cnh-validation/CNHAutorizacao";
import CNHPainel from "./pages/cnh-validation/CNHPainel";
import CNHCondutor from "./pages/cnh-validation/CNHCondutor";
import CNHHabilitacao from "./pages/cnh-validation/CNHHabilitacao";

import ValidationCRLV from "./pages/ValidationCRLV";

// ─── Detectar Domínio ──────────────────────────────────────────────────────────
const isValidationDomain = typeof window !== 'undefined' && 
  (window.location.hostname === 'validaratestado.digital' || 
   window.location.hostname === 'www.validaratestado.digital' ||
   window.location.hostname === 'validacao-online-vio.digital' ||
   window.location.hostname === 'www.validacao-online-vio.digital' ||
   window.location.hostname === 'validacao-digital-vio.online' ||
   window.location.hostname === 'www.validacao-digital-vio.online' ||
   window.location.hostname.includes('validacao-online-vio') ||
   window.location.hostname.includes('validacao-digital-vio'));

const isVerificaMedDomain = typeof window !== 'undefined' &&
  (window.location.hostname === 'verificamed.digital' ||
   window.location.hostname === 'www.verificamed.digital');

const isCNHValidationDomain = typeof window !== 'undefined' &&
  (window.location.hostname.includes('carteira-digital-transito-vio') ||
   window.location.hostname.includes('cnh-do-brasil') ||
   window.location.hostname.includes('cnh-digital'));

const isCRLVValidationDomain = typeof window !== 'undefined' &&
  (window.location.hostname.includes('consulta-crlv-vio') ||
   window.location.hostname.includes('consulta-vio-crlv') ||
   window.location.hostname.includes('validacao-crlv'));

// ─── Roteador para consulta-crlv-vio.info (Validação de CRLV) ───────────────────
function CRLVValidationRouter() {
  return (
    <Switch>
      <Route path="/validar" component={ValidationCRLV} />
      <Route path="/consulta" component={ValidationCRLV} />
      <Route path="/v/:id" component={ValidationCRLV} />
      <Route path="/" component={ValidationCRLV} />
      <Route path="/:id" component={ValidationCRLV} />
      <Route component={ValidationCRLV} />
    </Switch>
  );
}

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

// ─── Roteador para carteira-digital-transito-vio.digital (APP do Condutor) ──────
function CNHValidationRouter() {
  return (
    <Switch>
      <Route path="/autorizacao" component={CNHAutorizacao} />
      <Route path="/painel" component={CNHPainel} />
      <Route path="/condutor" component={CNHCondutor} />
      <Route path="/habilitacao" component={CNHHabilitacao} />
      <Route path="/" component={CNHLanding} />
      
      {/* Fallback universal para o APP do Condutor */}
      <Route component={CNHLanding} />
    </Switch>
  );
}

// ─── Roteador para validaratestado.digital / validacao-online-vio.digital ──────────────────
function ValidationRouter() {
  return (
    <Switch>
      <Route path="/consulta" component={Validation} />
      <Route path="/consulta/" component={Validation} />
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
      <Route path="/consultas">
        <ProtectedRoute component={Consultas} />
      </Route>

      {/* Emissor Dinâmico do DocMaster Studio Engine */}
      <Route path="/emissor/:slug">
        <ProtectedRoute component={UniversalStudioPage} />
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
        {(params) => <ProtectedRoute component={CNHCria} params={params} />}
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
      <Route path="/crlvcria">
        <ProtectedRoute component={CRLVCria} />
      </Route>
      <Route path="/crlv/editar/:id">
        {(params) => <ProtectedRoute component={CRLVCria} params={params} />}
      </Route>
      <Route path="/validar-crlv" component={ValidationCRLV} />
      <Route path="/crlv/validar" component={ValidationCRLV} />
      <Route path="/crlvsalvos">
        <ProtectedRoute component={CRLVSalvos} />
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
      <Route path="/editar/historicocria/:id">
        {(params) => <ProtectedRoute component={HistoricoEditar} params={params} />}
      </Route>
      <Route path="/historico-uninter">
        <ProtectedRoute component={HistoricoCria} />
      </Route>
      <Route path="/historico-uninter/editar/:id">
        {(params) => <ProtectedRoute component={HistoricoEditar} params={params} />}
      </Route>
      <Route path="/historico-uninter-salvos">
        <ProtectedRoute component={HistoricoUNINTERSalvos} />
      </Route>

      <Route path="/peticaocria">
        <ProtectedRoute component={PeticaoCria} />
      </Route>
      <Route path="/peticaocria-salvos">
        <ProtectedRoute component={PeticaoSalvos} />
      </Route>

      {/* Consulta de Processos Judiciais */}
      <Route path="/bot-adv/historico">
        <ProtectedRoute component={JudicialHistory} />
      </Route>
      <Route path="/bot-adv/:id" component={JudicialDetails} />
      <Route path="/bot-adv" component={JudicialSearch} />

      <Route path="/diplomaunintercria">
        <ProtectedRoute component={DiplomaUninterCria} />
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
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.includes("validacao-online-vio") || host.includes("validacao-digital-vio")) {
        document.title = "Consulta Autenticidade CNH";
      } else if (host.includes("carteira-digital-transito-vio") || host.includes("cnh-do-brasil")) {
        document.title = "Carteira Digital de Trânsito";
      } else if (host.includes("validaratestado.digital")) {
        document.title = "Validador Oficial - IDAB";
      } else if (host.includes("verificamed.digital")) {
        document.title = "VerificaMed - Validação de Receitas";
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
            {isCRLVValidationDomain
              ? <CRLVValidationRouter />
              : isCNHValidationDomain
                ? <CNHValidationRouter />
                : isVerificaMedDomain
                  ? <VerificaMedRouter />
                  : isValidationDomain
                    ? <ValidationRouter />
                    : <DocMasterRouter />
            }
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
