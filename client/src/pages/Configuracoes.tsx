import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  User, Camera, Lock, Sun, Moon, Check, X, Upload, Image as ImageIcon
} from "lucide-react";

const STATIC_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
];

export default function Configuracoes() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<"perfil" | "senha" | "aparencia">("perfil");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email }),
      });
      const data = await res.json();
      if (data.success) {
        updateUser({ displayName: data.user.displayName, email: data.user.email });
        showMsg("success", "Perfil atualizado com sucesso!");
      } else {
        showMsg("error", data.error || "Erro ao salvar");
      }
    } catch {
      showMsg("error", "Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMsg("error", "As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      showMsg("error", "A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showMsg("success", "Senha alterada com sucesso!");
      } else {
        showMsg("error", data.error || "Erro ao alterar senha");
      }
    } catch {
      showMsg("error", "Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: url }),
      });
      const data = await res.json();
      if (data.success) {
        updateUser({ profilePhoto: url });
        setShowAvatarPicker(false);
        showMsg("success", "Foto de perfil atualizada!");
      }
    } catch {
      showMsg("error", "Erro ao atualizar foto");
    } finally {
      setSaving(false);
    }
  };

  const compressAvatarImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showMsg("error", "Arquivo muito grande. Máximo 5MB.");
      return;
    }
    setSaving(true);
    try {
      const compressedDataUrl = await compressAvatarImage(file);
      await handleSelectAvatar(compressedDataUrl);
    } catch {
      showMsg("error", "Erro ao processar a foto de perfil");
      setSaving(false);
    }
  };

  const tabs = [
    { key: "perfil", label: "Perfil", icon: User },
    { key: "senha", label: "Alterar Senha", icon: Lock },
    { key: "aparencia", label: "Aparência", icon: Sun },
  ] as const;

  return (
    <DashboardLayout>
      <div className="p-7 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie seu perfil e preferências</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  tab === t.key
                    ? "bg-white dark:bg-gray-900 text-yellow-600 dark:text-yellow-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Notification */}
        {msg && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-medium ${
            msg.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}>
            {msg.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {msg.text}
          </div>
        )}

        {/* Perfil Tab */}
        {tab === "perfil" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center overflow-hidden border-4 border-yellow-200 dark:border-yellow-800">
                  {user?.profilePhoto ? (
                    <img src={user.profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                  )}
                </div>
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.displayName || user?.username}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 font-medium"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload foto
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={() => setShowAvatarPicker(true)}
                    className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 font-medium"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Escolher avatar
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">Escolher Avatar</h3>
                    <button onClick={() => setShowAvatarPicker(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {STATIC_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectAvatar(url)}
                        className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                          user?.profilePhoto === url
                            ? "border-yellow-500 shadow-lg"
                            : "border-gray-200 dark:border-gray-700 hover:border-yellow-300"
                        }`}
                      >
                        <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover bg-gray-100" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-yellow-400 hover:text-yellow-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Fazer upload de imagem
                  </button>
                </div>
              </div>
            )}

            {/* Profile Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome de exibição
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Usuário
                </label>
                <input
                  type="text"
                  value={user?.username || ""}
                  disabled
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">O nome de usuário não pode ser alterado</p>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
              >
                {saving ? "Salvando..." : "Salvar Perfil"}
              </button>
            </div>
          </div>
        )}

        {/* Senha Tab */}
        {tab === "senha" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Alterar Senha</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Mantenha sua conta segura</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Senha atual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <button
                onClick={handleSavePassword}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
              >
                {saving ? "Alterando..." : "Alterar Senha"}
              </button>
            </div>
          </div>
        )}

        {/* Aparência Tab */}
        {tab === "aparencia" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Sun className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Aparência</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Personalize a interface</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tema</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => theme === "dark" && toggleTheme()}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    theme === "light"
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="w-full h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <Sun className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    {theme === "light" && <Check className="w-4 h-4 text-yellow-500" />}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo Claro</span>
                  </div>
                </button>
                <button
                  onClick={() => theme === "light" && toggleTheme()}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    theme === "dark"
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="w-full h-16 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center shadow-sm">
                    <Moon className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    {theme === "dark" && <Check className="w-4 h-4 text-yellow-500" />}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo Escuro</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
