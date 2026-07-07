# Regras Globais

1. Implementa APENAS o que está explicitamente descrito neste prompt e na spec referenciada. Não adiciones funcionalidades, campos, endpoints, bibliotecas ou padrões que não sejam mencionados.

2. Se encontrares uma decisão de implementação que a spec não cobre (ex: estratégia de cache, formato de resposta de erro, ordenação por omissão), NÃO assumas nem decidas sozinho. Para o trabalho e faz a pergunta ao utilizador. Espera pela resposta antes de continuar.

3. Se a spec contiver ambiguidade ou contradição, NÃO interpretes nem resolves sozinho. Apresenta a ambiguidade de forma clara e pergunta ao utilizador como proceder.

4. Não actualizes, refactores nem "melhorares" código de módulos anteriores a não ser que este prompt o instrua explicitamente.

5. Após concluir a implementação, executa as acções de fecho descritas na secção "Acções de Fecho" no final de cada prompt. Não saltes esta secção.

6. Mantém o ficheiro `PROJECT_STATE.md` actualizado. Sempre que uma fase é concluída, regista:
   - A fase, passo, data e descrição no histórico
   - Qualquer decisão tomada (com ID, valor e impacto)
   - Actualiza o estado corrente e a data da última actualização

7. Formato das perguntas ao utilizador:
   QUESTÃO [ID]: [descrição clara do que precisa de decisão]
   Opções sugeridas: [lista de alternativas se aplicável]
   Impacto: [o que muda consoante a resposta]

8. Ao final de cada interacção, alteração ou prompt, exibe o comando para fazer commit e push no git (ex: `git add -A && git commit -m "mensagem" && git push`).
