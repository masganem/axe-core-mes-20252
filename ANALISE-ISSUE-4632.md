# Análise Comparativa - Issue #4632: isFocusable tabindex parsing

**Data da análise:** 07/11/2025  
**Issue original:** https://github.com/dequelabs/axe-core/issues/4632  
**PR que corrigiu:** https://github.com/dequelabs/axe-core/pull/4637  
**Commit da correção oficial:** 645a850f601f4f3f18cc4aaca399aad18a9fa5d2  
**Data do merge:** 25/11/2024

---

## 📋 Descrição do Bug

O método `isFocusable()` estava usando `parseInt()` para verificar se o atributo `tabindex` era válido. Isso não segue a especificação HTML5 para parsing de inteiros.

**Problema específico:**
- `parseInt("1abc")` retorna `1` (aceita valores inválidos)
- A spec HTML5 requer regex `/^\s*([-+]?\d+)/` para validar corretamente

**Arquivo afetado:** `lib/commons/dom/is-focusable.js`

---

## 💡 Minha Solução (Implementada pelo LLM)

### Código Original (com bug):
```javascript
// check if the tabindex is specified and a parseable number
const tabindex = vNode.attr('tabindex');
if (tabindex && !isNaN(parseInt(tabindex, 10))) {
  return true;
}

return false;
```

### Minha Correção:
```javascript
// check if the tabindex is specified and a parseable number
// Following HTML5 spec: https://html.spec.whatwg.org/#rules-for-parsing-integers
const tabindex = vNode.attr('tabindex');
if (tabindex) {
  const match = tabindex.trim().match(/^\s*([-+]?\d+)/);
  if (match) {
    return true;
  }
}

return false;
```

**Linhas modificadas:** 7 linhas (antes: 5 linhas)

---

## ✅ Solução Oficial (PR #4637)

### Abordagem:
A solução oficial foi muito mais abrangente e seguiu princípios de engenharia de software:

1. **Criou uma função utilitária reutilizável:**
   - Arquivo: `lib/core/utils/parse-tabindex.js`
   - Função: `parseTabindex(value)`
   - Retorna: `number | null`

2. **Aplicou a correção em 13 arquivos diferentes:**
   - `lib/checks/keyboard/focusable-no-name-evaluate.js`
   - `lib/checks/keyboard/no-focusable-content-evaluate.js`
   - `lib/checks/keyboard/tabindex-evaluate.js`
   - `lib/commons/dom/get-tabbable-elements.js`
   - `lib/commons/dom/inserted-into-focus-order.js`
   - `lib/commons/dom/is-focusable.js` ⭐
   - `lib/commons/dom/is-in-tab-order.js`
   - `lib/core/base/context/create-frame-context.js`
   - `lib/rules/autocomplete-matches.js`
   - `lib/rules/no-negative-tabindex-matches.js`
   - E mais...

3. **Criou testes unitários:**
   - Arquivo: `test/core/utils/parse-tabindex.js`
   - 39 linhas de testes

### Código da função utilitária:
```javascript
function parseTabindex(value) {
  if (typeof value !== 'string') {
    return null;
  }

  // spec: https://html.spec.whatwg.org/#rules-for-parsing-integers
  const match = value.trim().match(/^([-+]?\d+)/);
  if (match) {
    return Number(match[1]);
  }

  return null;
}
```

### Código aplicado em is-focusable.js:
```javascript
import { parseTabindex } from '../../core/utils';

// ... código anterior ...

// check if the tabindex is specified and a parseable number
const tabindex = parseTabindex(vNode.attr('tabindex'));
return tabindex !== null;
```

**Linhas modificadas:** 2 linhas (antes: 5 linhas)  
**Total de mudanças no projeto:** 13 arquivos, +93 linhas, -31 linhas

---

## 📊 Comparação Detalhada

| Aspecto | Minha Solução | Solução Oficial |
|---------|---------------|-----------------|
| **Corrige o bug?** | ✅ Sim | ✅ Sim |
| **Segue a spec HTML5?** | ✅ Sim | ✅ Sim |
| **Linhas de código (is-focusable.js)** | 7 linhas | 2 linhas |
| **Reutilização de código** | ❌ Não (inline) | ✅ Sim (função utilitária) |
| **Arquivos corrigidos** | ❌ Apenas 1 | ✅ 13 arquivos |
| **Testes unitários** | ❌ Não criados | ✅ 39 linhas de testes |
| **Retorna valor parseado** | ❌ Não (só boolean) | ✅ Sim (number \| null) |
| **Manutenibilidade** | ⚠️ Média | ✅ Alta |
| **Princípio DRY** | ❌ Violado | ✅ Respeitado |

---

## 🔍 Problemas Identificados na Minha Solução

### 1. **Redundância no Regex**
```javascript
const match = tabindex.trim().match(/^\s*([-+]?\d+)/);
```
- Uso `trim()` E `\s*` no regex
- Solução oficial: só usa regex `match(/^([-+]?\d+)/)` após `trim()`

### 2. **Não Reutilizável**
- Código duplicado ficaria em 13 lugares diferentes
- Violação do princípio DRY (Don't Repeat Yourself)
- Manutenção futura seria custosa

### 3. **Não Retorna o Valor Parseado**
- Minha solução: retorna apenas `true/false`
- Solução oficial: retorna o número parseado ou `null`
- Mais útil para outros casos de uso

### 4. **Falta de Testes**
- Não criei testes unitários
- Solução oficial: 39 linhas de testes cobrindo edge cases

### 5. **Escopo Limitado**
- Só corrigi 1 arquivo quando o problema existia em 13

---

## ✅ Pontos Positivos da Minha Solução

1. **Corrige o bug principal** - funciona corretamente
2. **Segue a spec HTML5** - usa o regex correto
3. **Adiciona comentário explicativo** - referência à spec
4. **Solução funcional** - resolve o problema imediato

---

## 🎓 Lições Aprendidas

### 1. **Análise de Escopo**
Antes de corrigir um bug, é importante:
- Buscar TODOS os lugares onde o problema existe
- Usar ferramentas como `grep` para encontrar padrões similares
- Pensar em reutilização desde o início

### 2. **Princípios de Engenharia de Software**
A solução oficial demonstra:
- **DRY (Don't Repeat Yourself)**: Uma função, múltiplos usos
- **Single Responsibility**: Função dedicada ao parsing de tabindex
- **Testabilidade**: Função isolada é mais fácil de testar
- **Manutenibilidade**: Mudanças futuras em um só lugar

### 3. **Qualidade de Código**
- **Testes são essenciais**: A solução oficial incluiu testes robustos
- **Simplicidade**: 2 linhas vs 7 linhas
- **Clareza**: Nome da função `parseTabindex` é auto-explicativo

### 4. **Code Review**
O PR #4637 teve code reviews que sugeriram:
- Criar a função utilitária (não estava na versão inicial)
- Aplicar em todos os lugares
- Adicionar testes

---

## 📝 Conclusão

**Minha solução:** ⭐⭐⭐ (3/5)
- ✅ Funcional e correta
- ❌ Limitada e não reutilizável

**Solução oficial:** ⭐⭐⭐⭐⭐ (5/5)
- ✅ Completa, reutilizável e testada
- ✅ Segue melhores práticas
- ✅ Resolve o problema em todo o projeto

**Veredicto:** A solução oficial é significativamente superior devido à:
1. Reutilização de código (DRY)
2. Correção abrangente (13 arquivos)
3. Testes unitários
4. Melhor manutenibilidade
5. Código mais limpo e conciso

---

## 🔗 Referências

- Issue original: https://github.com/dequelabs/axe-core/issues/4632
- Pull Request: https://github.com/dequelabs/axe-core/pull/4637
- HTML5 Spec - Parsing Integers: https://html.spec.whatwg.org/#rules-for-parsing-integers
- Commit da correção: 645a850f601f4f3f18cc4aaca399aad18a9fa5d2

---

**Análise realizada por:** GitHub Copilot (LLM)  
**Contexto:** Trabalho de Manutenção e Evolução de Software - 2025/2
