# Leitor

Protótipo mobile para leitura de etiquetas de encomendas pela câmera do celular.

## V1
- Abre a câmera traseira
- Detecta formatos suportados pelo BarcodeDetector do navegador
- Exibe valor e formato do código
- Vibra após uma nova leitura
- Permite copiar o resultado
- Possui entrada manual para teste

## Importante
A etiqueta não necessariamente contém nome/endereço dentro do código. Muitas transportadoras codificam apenas um identificador. Para transformar o identificador em dados de destinatário é necessário uma fonte de dados autorizada ou extrair texto visível da própria etiqueta via OCR.

A câmera exige HTTPS (ou localhost) no navegador.
