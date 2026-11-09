"""Gera os arquivos de ícone e tela de abertura do Dominus em assets/.

O GitHub Actions usa @capacitor/assets para transformar esses arquivos nos tamanhos do Android.
Uso: python3 tools/gerar-icones.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "assets")
os.makedirs(SAIDA, exist_ok=True)

INDIGO = (84, 70, 210)
INDIGO_ESCURO = (18, 21, 31)
AMARELO = (255, 194, 40)
BRANCO = (255, 255, 255)
FONTE = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"


def marca(tam, cor_d=BRANCO, escala=1.0):
    """Monograma D com um capelo amarelo apoiado no topo, em fundo transparente."""
    img = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    fonte = ImageFont.truetype(FONTE, int(tam * 0.56 * escala))
    caixa = dr.textbbox((0, 0), "D", font=fonte)
    w, hgt = caixa[2] - caixa[0], caixa[3] - caixa[1]
    desloc = tam * 0.06 * escala  # desce o D para caber o capelo
    x = (tam - w) / 2 - caixa[0]
    y = (tam - hgt) / 2 - caixa[1] + desloc
    dr.text((x, y), "D", font=fonte, fill=cor_d)
    # capelo: losango achatado sobre o D, com base e pingente
    topo_d = (tam - hgt) / 2 + desloc
    cx = tam / 2
    lw, lh = w * 0.62, hgt * 0.17
    cy = topo_d - lh * 0.15
    dr.polygon([(cx - lw, cy), (cx, cy - lh), (cx + lw, cy), (cx, cy + lh)], fill=AMARELO)
    bw = lw * 0.55
    dr.rectangle([cx - bw, cy + lh * 0.35, cx + bw, cy + lh * 1.05], fill=AMARELO)
    larg = max(2, int(tam * 0.016 * escala))
    px = cx + lw * 0.78
    dr.line([(px, cy + lh * 0.2), (px, cy + lh * 2.1)], fill=AMARELO, width=larg)
    r = tam * 0.026 * escala
    dr.ellipse([px - r, cy + lh * 2.0, px + r, cy + lh * 2.0 + r * 2.4], fill=AMARELO)
    return img


def arredondado(tam, cor, raio):
    img = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, tam - 1, tam - 1], radius=raio, fill=cor)
    return img


# ícone completo (versões antigas do Android)
icone = arredondado(1024, INDIGO, 220)
icone.alpha_composite(marca(1024))
icone.save(os.path.join(SAIDA, "icon-only.png"))

# ícone adaptativo: frente (área segura de 66%) e fundo
frente = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
frente.alpha_composite(marca(1024, escala=0.7))
frente.save(os.path.join(SAIDA, "icon-foreground.png"))
Image.new("RGBA", (1024, 1024), INDIGO + (255,)).save(os.path.join(SAIDA, "icon-background.png"))


def splash(fundo, nome):
    tam = 2732
    img = Image.new("RGBA", (tam, tam), fundo + (255,))
    ic = arredondado(560, INDIGO if fundo != INDIGO else (104, 90, 226), 120)
    ic.alpha_composite(marca(560))
    img.alpha_composite(ic, ((tam - 560) // 2, tam // 2 - 520))
    dr = ImageDraw.Draw(img)
    f1 = ImageFont.truetype(FONTE, 150)
    f2 = ImageFont.truetype("/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf", 72)
    for texto, fonte, y in (("Dominus", f1, tam // 2 + 120), ("Seu desenvolvedor acadêmico", f2, tam // 2 + 320)):
        b = dr.textbbox((0, 0), texto, font=fonte)
        dr.text(((tam - (b[2] - b[0])) / 2 - b[0], y), texto, font=fonte, fill=BRANCO)
    img.convert("RGB").save(os.path.join(SAIDA, nome))


splash(INDIGO, "splash.png")
splash(INDIGO_ESCURO, "splash-dark.png")
print("Arquivos gerados em assets/:", sorted(os.listdir(SAIDA)))
