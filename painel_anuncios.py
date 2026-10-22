import os
import re
import subprocess
import urllib.request
import urllib.parse
from html import unescape
import tkinter as tk
from tkinter import ttk, messagebox

# Caminho para o ficheiro de configuração
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "ads-config.js")

def extrair_dados_google(url_maps):
    """
    Descarrega o HTML público do link do Google Maps e extrai metadados
    sem necessitar de chaves de API pagas.
    """
    req = urllib.request.Request(
        url_maps,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) "
                "Gecko/20100101 Firefox/120.0"
            ),
            "Accept-Language": "pt-BR,pt;q=0.9"
        }
    )
    
    with urllib.request.urlopen(req, timeout=12) as response:
        html = response.read().decode("utf-8", errors="ignore")
        url_final = response.geturl()

    dados = {
        "titulo": "",
        "avaliacao": "",
        "endereco": "",
        "telefone": "",
        "rotaUrl": url_final
    }

    # Procura pelo nome da empresa na tag <title> ou em metatags
    match_title = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    if match_title:
        titulo_limpo = unescape(match_title.group(1)).split("·")[0].strip()
        dados["titulo"] = titulo_limpo
    else:
        match_tag_title = re.search(r'<title>([^<]+)</title>', html)
        if match_tag_title:
            dados["titulo"] = unescape(match_tag_title.group(1)).split("·")[0].replace("- Google Maps", "").strip()

    # Procura por classificação de estrelas e contagem de avaliações (ex: 4,9 estrelas, 186 comentários)
    match_rating = re.search(r'([0-9],[0-9])\s*★.*?([0-9\.]+)\s*(?:avaliações|comentários|classificações)', html, re.IGNORECASE)
    if match_rating:
        nota = match_rating.group(1)
        qtd = match_rating.group(2)
        dados["avaliacao"] = f"{nota} ★★★★★ ({qtd} avaliações no Google)"
    else:
        match_simples = re.search(r'([0-9],[0-9])\s*estrelas', html, re.IGNORECASE)
        if match_simples:
            dados["avaliacao"] = f"{match_simples.group(1)} ★★★★★ no Google"

    # Procura por telefone no formato brasileiro
    match_tel = re.search(r'(\+?55\s?\(?[1-9]{2}\)?\s?9?[0-9]{4}[-\s]?[0-9]{4}|\(?[1-9]{2}\)?\s?[2-9][0-9]{3}[-\s]?[0-9]{4})', html)
    if match_tel:
        dados["telefone"] = re.sub(r'\D', '', match_tel.group(1))

    # Procura por endereço no texto descritivo
    match_desc = re.search(r'<meta property="og:description" content="([^"]+)"', html)
    if match_desc:
        desc_text = unescape(match_desc.group(1))
        partes = desc_text.split("·")
        if len(partes) > 1:
            dados["endereco"] = partes[-1].strip()

    return dados

def acao_importar_google():
    url = ent_url_maps.get().strip()
    if not url:
        messagebox.showwarning("Aviso", "Introduza um link do Google Maps para importar os dados.")
        return

    status_lbl.config(text="A consultar dados no Google...", foreground="blue")
    root.update()

    try:
        dados = extrair_dados_google(url)
        
        if dados["titulo"]:
            ent_titulo.delete(0, tk.END)
            ent_titulo.insert(0, dados["titulo"])
            
        if dados["avaliacao"]:
            ent_avaliacao.delete(0, tk.END)
            ent_avaliacao.insert(0, dados["avaliacao"])
            
        if dados["endereco"]:
            ent_endereco.delete(0, tk.END)
            ent_endereco.insert(0, dados["endereco"])

        if dados["telefone"]:
            ent_whatsapp.delete(0, tk.END)
            ent_whatsapp.insert(0, dados["telefone"])

        if dados["rotaUrl"]:
            ent_rota.delete(0, tk.END)
            ent_rota.insert(0, dados["rotaUrl"])

        status_lbl.config(text="Dados importados com sucesso!", foreground="green")
        messagebox.showinfo("Sucesso", "Dados importados do Google Maps! Verifique e ajuste os campos conforme pretendido.")
    except Exception as err:
        status_lbl.config(text="Falha ao extrair dados do link.", foreground="red")
        messagebox.showerror("Erro de Importação", f"Não foi possível consultar o link: {err}\nVerifique se o link está acessível.")

def publicar_git():
    try:
        subprocess.run(["git", "add", "ads-config.js"], cwd=SCRIPT_DIR, check=True)
        resultado_diff = subprocess.run(["git", "status", "--porcelain"], cwd=SCRIPT_DIR, capture_output=True, text=True)
        if not resultado_diff.stdout.strip():
            return True, "Nenhuma alteração detetada para envio."
        
        subprocess.run(["git", "commit", "-m", "Adiciona anunciante com dados do Google via Painel Local"], cwd=SCRIPT_DIR, check=True)
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
    mensagem = ent_msg.get().strip() or f"Olá! Encontrei o vosso anúncio no Placa Perdida e gostaria de solicitar informações."
    avaliacao = ent_avaliacao.get().strip()
    endereco = ent_endereco.get().strip()
    rota_url = ent_rota.get().strip()

    if not titulo or not categoria or not whatsapp:
        messagebox.showwarning("Campos Obrigatórios", "Por favor, preencha pelo menos o Título, Categoria e WhatsApp.")
        return

    if not whatsapp.startswith("55"):
        whatsapp = "55" + whatsapp

    anuncio_id = "ad-" + re.sub(r"[^a-z0-9]", "", titulo.lower())[:15]

    # Estrutura preparada para suportar o formato enriquecido
    novo_bloco = f"""    {{
      id: '{anuncio_id}',
      categoria: '{categoria}',
      titulo: '{titulo}',
      descricao: '{descricao}',
      icone: '{icone}',
      tag: 'Patrocinador Recomendado',
      avaliacao: '{avaliacao}',
      endereco: '{endereco}',
      rotaUrl: '{rota_url}',
      ctaText: '{cta_text}',
      linkWhatsApp: '{whatsapp}',
      mensagemPadrao: '{mensagem}'
    }},
"""

    if not os.path.exists(CONFIG_FILE):
        messagebox.showerror("Erro", f"Ficheiro não encontrado: {CONFIG_FILE}")
        return

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            conteudo = f.read()

        marcador = "banners: ["
        if marcador in conteudo:
            partes = conteudo.split(marcador, 1)
            conteudo_atualizado = partes[0] + marcador + "\n" + novo_bloco + partes[1]
        else:
            messagebox.showerror("Erro de Formato", "Não foi encontrada a chave 'banners: [' no ficheiro ads-config.js.")
            return

        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            f.write(conteudo_atualizado)

    except Exception as e:
        messagebox.showerror("Erro ao Salvar", f"Não foi possível salvar no ficheiro: {e}")
        return

    if messagebox.askyesno("Guardado Localmente", "Anunciante adicionado a ads-config.js!\n\nDeseja publicar as alterações na Cloudflare agora?"):
        status_lbl.config(text="A enviar alterações para o GitHub...", foreground="blue")
        root.update()
        sucesso, msg = publicar_git()
        if sucesso:
            messagebox.showinfo("Sucesso", msg)
            status_lbl.config(text="Publicação concluída com sucesso!", foreground="green")
            limpar_campos()
        else:
