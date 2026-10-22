import os
import re
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox

# Caminho para o arquivo de configuração
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "ads-config.js")

def publicar_git():
    """Faz commit e push das alterações para o GitHub / Cloudflare"""
    try:
        subprocess.run(["git", "add", "ads-config.js"], cwd=SCRIPT_DIR, check=True)
        resultado_diff = subprocess.run(["git", "status", "--porcelain"], cwd=SCRIPT_DIR, capture_output=True, text=True)
        if not resultado_diff.stdout.strip():
            return True, "Nenhuma alteração detectada para envio."
        
        subprocess.run(["git", "commit", "-m", "Adiciona novo anunciante via Painel Local"], cwd=SCRIPT_DIR, check=True)
        subprocess.run(["git", "push"], cwd=SCRIPT_DIR, check=True)
        return True, "Publicado com sucesso no GitHub! O Cloudflare atualizará o site em segundos."
    except subprocess.CalledProcessError as err:
        return False, f"Erro no comando Git: {err}"
    except Exception as e:
        return False, f"Falha na publicação: {e}"

def salvar_anunciante():
    titulo = ent_titulo.get().strip()
    categoria = ent_categoria.get().strip()
    descricao = txt_desc.get("1.0", tk.END).strip()
    whatsapp = re.sub(r"\D", "", ent_whatsapp.get().strip())
    icone = ent_icone.get().strip() or "📢"
    cta_text = ent_cta.get().strip() or "Chamar no WhatsApp"
    mensagem = ent_msg.get().strip() or f"Olá! Vi o anúncio no Placa Perdida e gostaria de saber mais."

    if not titulo or not categoria or not descricao or not whatsapp:
        messagebox.showwarning("Campos Obrigatórios", "Por favor, preencha Título, Categoria, Descrição e WhatsApp.")
        return

    # Garante DDI 55
    if not whatsapp.startswith("55"):
        whatsapp = "55" + whatsapp

    # Gera id simples
    anuncio_id = "ad-" + re.sub(r"[^a-z0-9]", "", titulo.lower())[:15]

    novo_bloco = f"""    {{
      id: '{anuncio_id}',
      categoria: '{categoria}',
      titulo: '{titulo}',
      descricao: '{descricao}',
      icone: '{icone}',
      tag: 'Patrocinador',
      ctaText: '{cta_text}',
      linkWhatsApp: '{whatsapp}',
      mensagemPadrao: '{mensagem}'
    }},
"""

    if not os.path.exists(CONFIG_FILE):
        messagebox.showerror("Erro", f"Arquivo não encontrado: {CONFIG_FILE}\nCertifique-se de que o script está na pasta do site.")
        return

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            conteudo = f.read()

        # Localiza o array 'banners: [' para inserir no topo
        marcador = "banners: ["
        if marcador in conteudo:
            partes = conteudo.split(marcador, 1)
            conteudo_atualizado = partes[0] + marcador + "\n" + novo_bloco + partes[1]
        else:
            messagebox.showerror("Erro de Formato", "Não foi encontrada a chave 'banners: [' no arquivo ads-config.js.")
            return

        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            f.write(conteudo_atualizado)

    except Exception as e:
        messagebox.showerror("Erro ao Salvar", f"Não foi possível salvar no arquivo: {e}")
        return

    # Pergunta se deseja subir para o Cloudflare agora
    if messagebox.askyesno("Salvo Localmente!", "Anunciante gravado em ads-config.js!\n\nDeseja subir (Git Push) para a Cloudflare agora?"):
        status_lbl.config(text="Enviando para a Cloudflare via Git...", foreground="blue")
        root.update()
        sucesso, msg = publicar_git()
        if sucesso:
            messagebox.showinfo("Sucesso!", msg)
            status_lbl.config(text="Último status: Publicado com sucesso!", foreground="green")
            limpar_campos()
        else:
            messagebox.showerror("Aviso Git", msg)
            status_lbl.config(text="Erro ao sincronizar com GitHub.", foreground="red")
    else:
        messagebox.showinfo("Salvo", "Salvo apenas no arquivo local.")
        limpar_campos()

def limpar_campos():
    ent_titulo.delete(0, tk.END)
    ent_categoria.delete(0, tk.END)
    txt_desc.delete("1.0", tk.END)
    ent_whatsapp.delete(0, tk.END)
    ent_icone.delete(0, tk.END)
    ent_icone.insert(0, "📢")
    ent_cta.delete(0, tk.END)
    ent_cta.insert(0, "Chamar no WhatsApp")
    ent_msg.delete(0, tk.END)

# ================= Interface Gráfica =================
root = tk.Tk()
root.title("Gerenciador de Anunciantes - Placa Perdida")
root.geometry("540x680")
root.resizable(False, False)

style = ttk.Style()
style.theme_use("clam")

main_frame = ttk.Frame(root, padding="16")
main_frame.pack(fill=tk.BOTH, expand=True)

ttk.Label(main_frame, text="Novo Anunciante / Patrocinador", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(0, 10))

# Categoria
ttk.Label(main_frame, text="Categoria (ex: Chaveiro 24h, Auto Elétrica, Oficina):").pack(anchor="w")
ent_categoria = ttk.Entry(main_frame, width=50)
ent_categoria.pack(fill=tk.X, pady=(2, 8))

# Título
ttk.Label(main_frame, text="Título do Anúncio (Nome da Empresa ou Promoção):").pack(anchor="w")
ent_titulo = ttk.Entry(main_frame, width=50)
ent_titulo.pack(fill=tk.X, pady=(2, 8))

# Descrição
ttk.Label(main_frame, text="Descrição dos Serviços / Oferta:").pack(anchor="w")
txt_desc = tk.Text(main_frame, height=4, width=50, font=("Helvetica", 10))
txt_desc.pack(fill=tk.X, pady=(2, 8))

# WhatsApp
ttk.Label(main_frame, text="WhatsApp Comercial (com DDD, ex: 34999998888):").pack(anchor="w")
ent_whatsapp = ttk.Entry(main_frame, width=50)
ent_whatsapp.pack(fill=tk.X, pady=(2, 8))

# Ícone Emoji
ttk.Label(main_frame, text="Emoji de Destaque (ex: 🔑, 🚗, 🛡️, 🚛):").pack(anchor="w")
ent_icone = ttk.Entry(main_frame, width=50)
ent_icone.insert(0, "📢")
ent_icone.pack(fill=tk.X, pady=(2, 8))

# Botão CTA
ttk.Label(main_frame, text="Texto do Botão (Ex: Solicitar Orçamento, Falar com Atendente):").pack(anchor="w")
ent_cta = ttk.Entry(main_frame, width=50)
ent_cta.insert(0, "Chamar no WhatsApp")
ent_cta.pack(fill=tk.X, pady=(2, 8))

# Mensagem Padrão
ttk.Label(main_frame, text="Mensagem pronta que o cliente enviará:").pack(anchor="w")
ent_msg = ttk.Entry(main_frame, width=50)
ent_msg.insert(0, "Olá! Vi seu anúncio no site Placa Perdida.")
ent_msg.pack(fill=tk.X, pady=(2, 14))

# Botão de Ação Principal
btn_salvar = tk.Button(
    main_frame,
    text="🚀 SALVAR E PUBLICAR NO SITE",
    font=("Helvetica", 11, "bold"),
    bg="#10b981",
    fg="#ffffff",
    padx=10,
    pady=10,
    cursor="hand2",
    command=salvar_anunciante
)
btn_salvar.pack(fill=tk.X, pady=8)

status_lbl = ttk.Label(main_frame, text="Pronto para novos cadastros.", font=("Helvetica", 9, "italic"))
status_lbl.pack(pady=4)

root.mainloop()
