# Análise Comparativa - Issue #3282

## Informações da Issue
- **Número**: #3282
- **Título**: unsupportedrole check bugs
- **URL**: https://github.com/dequelabs/axe-core/issues/3282
- **Status**: Closed
- **Data de Criação**: 8 de fevereiro de 2022
- **Autor**: dan-tripp
- **PR de Correção**: #3395
- **Commit de Correção**: 3c0f10f979ae1e3377dd6ef0d2b445ea5ec90eb3

## Descrição do Problema

A issue reportou 3 problemas no check `unsupportedrole`:

### 1. Valor do role não é adicionado ao `data`
O check não estava usando `this.data()` para passar o valor do role não suportado para a mensagem de falha. A mensagem em `unsupportedrole.json` esperava `${data.values}`, mas o campo nunca era preenchido.

### 2. Roles dpub não são reconhecidos
O código chamava `getRole(virtualNode)` sem a opção `{ dpub: true }`, fazendo com que roles de publicação digital (como `doc-abstract`) não fossem detectados como não suportados.

### 3. Fallback roles não são suportados
Quando um elemento tinha múltiplos roles (ex: `role="unsupported alert"`), apenas o primeiro era verificado. Sem a opção `{ fallback: true }`, roles válidos como fallback não eram detectados.

## Análise do Código Original (Buggy)

### lib/checks/aria/unsupportedrole-evaluate.js (antes)
```javascript
import { isUnsupportedRole, getRole } from '../../commons/aria';

/**
 * Check that an elements semantic role is unsupported.
 *
 * Unsupported roles are taken from the `ariaRoles` standards object from the roles `unsupported` property.
 *
 * @memberof checks
 * @return {Boolean} True if the elements semantic role is unsupported. False otherwise.
 */
function unsupportedroleEvaluate(node, options, virtualNode) {
  return isUnsupportedRole(getRole(virtualNode));
}

export default unsupportedroleEvaluate;
```

**Problemas identificados**:
- ❌ Não passa `{ dpub: true }` para `getRole()` → ignora roles dpub
- ❌ Não passa `{ fallback: true }` para `getRole()` → ignora fallback roles
- ❌ Não usa `this.data()` → valor não disponível para mensagem

### lib/checks/aria/unsupportedrole.json (antes)
```json
{
  "id": "unsupportedrole",
  "evaluate": "unsupportedrole-evaluate",
  "metadata": {
    "impact": "critical",
    "messages": {
      "pass": "ARIA role is supported",
      "fail": "The role used is not widely supported in screen readers and assistive technologies: ${data.values}"
    }
  }
}
```

**Problema identificado**:
- ❌ Usa `${data.values}` mas deveria usar `${data}` (formato string simples, não array)

## Solução Implementada pelo LLM

### lib/checks/aria/unsupportedrole-evaluate.js (LLM)
```javascript
import { isUnsupportedRole, getRole } from '../../commons/aria';

/**
 * Check that an elements semantic role is unsupported.
 *
 * Unsupported roles are taken from the `ariaRoles` standards object from the roles `unsupported` property.
 *
 * @memberof checks
 * @return {Boolean} True if the elements semantic role is unsupported. False otherwise.
 */
function unsupportedroleEvaluate(node, options, virtualNode) {
  const role = getRole(virtualNode, { dpub: true, fallback: true });
  const isUnsupported = isUnsupportedRole(role);
  
  if (isUnsupported) {
    this.data(role);
  }
  
  return isUnsupported;
}

export default unsupportedroleEvaluate;
```

**Mudanças implementadas**:
1. ✅ Adiciona `{ dpub: true, fallback: true }` ao chamar `getRole()`
2. ✅ Salva o role em variável para reutilização
3. ✅ Usa `this.data(role)` quando role é não suportado
4. ✅ Mantém estrutura condicional clara

### lib/checks/aria/unsupportedrole.json (LLM)
```json
{
  "id": "unsupportedrole",
  "evaluate": "unsupportedrole-evaluate",
  "metadata": {
    "impact": "critical",
    "messages": {
      "pass": "ARIA role is supported",
      "fail": "The role used is not widely supported in screen readers and assistive technologies: ${data}"
    }
  }
}
```

**Mudanças implementadas**:
- ✅ Troca `${data.values}` por `${data}`

### test/checks/aria/unsupportedrole.js (LLM)
```javascript
describe('unsupportedrole', function() {
  'use strict';

  var checkContext = axe.testUtils.MockCheckContext();
  var checkSetup = axe.testUtils.checkSetup;
  var check = checks.unsupportedrole;
  
  afterEach(function() {
    checkContext.reset();
    axe.reset();
  });

  it('should return true if applied to an unsupported role', function() {
    axe.configure({
      standards: {
        ariaRoles: {
          mccheddarton: {
            type: 'widget',
            unsupported: true
          }
        }
      }
    });

    var params = checkSetup(
      '<div id="target" role="mccheddarton">Contents</div>'
    );
    assert.isTrue(check.evaluate.apply(checkContext, params));
    assert.deepEqual(checkContext._data, "mccheddarton");
  });

  it('should return false if applied to a supported role', function() {
    var params = checkSetup('<div id="target" role="alert">Contents</div>');
    assert.isFalse(check.evaluate.apply(checkContext, params));
    assert.isNull(checkContext._data);

    var params = checkSetup('<button id="target">Contents</button>');
    assert.isFalse(check.evaluate.apply(checkContext, params));
    assert.isNull(checkContext._data);
  });

  it('should return false if applied to an invalid role', function() {
    var params = checkSetup('<input id="target" role="foo">');
    assert.isFalse(check.evaluate.apply(checkContext, params));
    assert.isNull(checkContext._data);
  });

  it('should return true if applied to an unsupported dpub role', function() {
    axe.configure({
      standards: {
        ariaRoles: {
          'doc-abstract': {
            type: 'section',
            unsupported: true
          }
        }
      }
    });

    var params = checkSetup(
      '<div id="target" role="doc-abstract">Contents</div>'
    );
    assert.isTrue(check.evaluate.apply(checkContext, params));
    assert.deepEqual(checkContext._data, "doc-abstract");
  });

  it('should return true if applied to an unsupported fallback role', function() {
    axe.configure({
      standards: {
        ariaRoles: {
          alert: {
            type: 'widget',
            unsupported: true
          }
        }
      }
    });

    var params = checkSetup(
      '<div id="target" role="unsupported alert">Contents</div>'
    );
    assert.isTrue(check.evaluate.apply(checkContext, params));
    assert.deepEqual(checkContext._data, "alert");
  });
});
```

**Mudanças nos testes**:
1. ✅ Usa `MockCheckContext` para poder verificar `_data`
2. ✅ Adiciona verificação `assert.deepEqual(checkContext._data, ...)` em testes positivos
3. ✅ Adiciona verificação `assert.isNull(checkContext._data)` em testes negativos
4. ✅ Adiciona teste novo para dpub roles
5. ✅ Adiciona teste novo para fallback roles

## Solução Oficial (PR #3395)

### lib/checks/aria/unsupportedrole-evaluate.js (Oficial)
```javascript
import { isUnsupportedRole, getRole } from '../../commons/aria';

/**
 * Check that an elements semantic role is unsupported.
 *
 * Unsupported roles are taken from the `ariaRoles` standards object from the roles `unsupported` property.
 *
 * @memberof checks
 * @return {Boolean} True if the elements semantic role is unsupported. False otherwise.
 */
function unsupportedroleEvaluate(node, options, virtualNode) {
  const role = getRole(virtualNode, { dpub: true, fallback: true });
  const isUnsupported = isUnsupportedRole(role);
  if (isUnsupported) {
    this.data(role);
  }
  return isUnsupported;
  
}

export default unsupportedroleEvaluate;
```

**Diferenças**:
- Linha em branco extra após `return isUnsupported;`
- Funcionalidade idêntica

### lib/checks/aria/unsupportedrole.json (Oficial)
```json
{
  "id": "unsupportedrole",
  "evaluate": "unsupportedrole-evaluate",
  "metadata": {
    "impact": "critical",
    "messages": {
      "pass": "ARIA role is supported",
      "fail": "The role used is not widely supported in screen readers and assistive technologies: ${data}"
    }
  }
}
```

**Diferenças**: Nenhuma - 100% idêntico

### test/checks/aria/unsupportedrole.js (Oficial)
**Diferenças**: Nenhuma - 100% idêntico

## Comparação Lado a Lado

### Arquivos Modificados

| Arquivo | LLM | Oficial | Match |
|---------|-----|---------|-------|
| lib/checks/aria/unsupportedrole-evaluate.js | ✅ | ✅ | 99.9% |
| lib/checks/aria/unsupportedrole.json | ✅ | ✅ | 100% |
| test/checks/aria/unsupportedrole.js | ✅ | ✅ | 100% |

### Estatísticas do Diff Oficial

```
 lib/checks/aria/unsupportedrole-evaluate.js |  8 ++++-
 lib/checks/aria/unsupportedrole.json         |  2 +-
 test/checks/aria/unsupportedrole.js          | 59 +++++++++++++++++++++---
 3 files changed, 66 insertions(+), 11 deletions(-)
```

### Análise de Diferenças

#### unsupportedrole-evaluate.js

**Solução LLM**:
```javascript
function unsupportedroleEvaluate(node, options, virtualNode) {
  const role = getRole(virtualNode, { dpub: true, fallback: true });
  const isUnsupported = isUnsupportedRole(role);
  
  if (isUnsupported) {
    this.data(role);
  }
  
  return isUnsupported;
}
```

**Solução Oficial**:
```javascript
function unsupportedroleEvaluate(node, options, virtualNode) {
  const role = getRole(virtualNode, { dpub: true, fallback: true });
  const isUnsupported = isUnsupportedRole(role);
  if (isUnsupported) {
    this.data(role);
  }
  return isUnsupported;
  
}
```

**Diferenças**:
- LLM: Linha em branco antes do `if`, outra antes do `return`
- Oficial: Sem linha antes do `if`, linha em branco após o `return`
- Ambas seguem padrão semelhante de espaçamento
- **Impacto**: Zero - puramente estilístico

## Análise de Qualidade

### Correção Funcional
- **LLM**: ✅ Resolve todos os 3 problemas reportados
- **Oficial**: ✅ Resolve todos os 3 problemas reportados
- **Similaridade**: 100%

### Qualidade do Código

#### Clareza
- **LLM**: ✅ Variáveis bem nomeadas, lógica clara
- **Oficial**: ✅ Variáveis bem nomeadas, lógica clara
- **Similaridade**: 100%

#### Eficiência
- **LLM**: ✅ Uma única chamada a `getRole()`, armazena resultado
- **Oficial**: ✅ Uma única chamada a `getRole()`, armazena resultado
- **Similaridade**: 100%

#### Manutenibilidade
- **LLM**: ✅ Código limpo, fácil de entender
- **Oficial**: ✅ Código limpo, fácil de entender
- **Similaridade**: 100%

### Cobertura de Testes

#### Casos de Teste
- **LLM**: ✅ 5 testes (básico + dpub + fallback + verificação de data)
- **Oficial**: ✅ 5 testes (básico + dpub + fallback + verificação de data)
- **Similaridade**: 100%

#### Qualidade dos Testes
- **LLM**: ✅ Usa MockCheckContext para verificar `_data`
- **Oficial**: ✅ Usa MockCheckContext para verificar `_data`
- **Similaridade**: 100%

## Padrão de Código Seguido

Ambas as soluções seguem o padrão estabelecido por `deprecatedrole-evaluate.js`:

```javascript
export default function deprecatedroleEvaluate(node, options, virtualNode) {
  const role = getRole(virtualNode, { dpub: true, fallback: true });
  const roleDefinition = standards.ariaRoles[role];
  if (!roleDefinition?.deprecated) {
    return false;
  }

  this.data(role);
  return true;
}
```

**Pontos em comum**:
1. ✅ Usa `{ dpub: true, fallback: true }` em `getRole()`
2. ✅ Salva role em variável
3. ✅ Usa `this.data(role)` para passar valor
4. ✅ Retorna boolean

## Conclusão

### Pontuação de Similaridade

| Aspecto | Similaridade |
|---------|--------------|
| Lógica Funcional | 100% |
| Estrutura do Código | 100% |
| Mensagens de Erro | 100% |
| Casos de Teste | 100% |
| Estilo de Código | 99% |
| **MÉDIA GERAL** | **99.8%** |

### Resumo das Diferenças

**Diferenças Encontradas**:
1. Espaçamento: LLM usa linha em branco antes do `if` e do `return`, oficial apenas após o `return`

**Diferenças NÃO Encontradas**:
- Nenhuma diferença funcional
- Nenhuma diferença em nomes de variáveis
- Nenhuma diferença em lógica
- Nenhuma diferença em testes

### Avaliação Final

**Qualidade da Solução LLM**: ⭐⭐⭐⭐⭐ (5/5)

**Justificativa**:
1. ✅ Identificou corretamente todos os 3 problemas da issue
2. ✅ Implementou solução idêntica à oficial (99.8% de similaridade)
3. ✅ Seguiu padrão existente de `deprecatedrole-evaluate.js`
4. ✅ Adicionou testes completos para dpub roles e fallback roles
5. ✅ Corrigiu mensagem JSON de `${data.values}` para `${data}`
6. ✅ Código limpo, eficiente e manutenível

**Categorização**: **SOLUÇÃO PERFEITA**

A solução do LLM é praticamente idêntica à solução oficial aceita no repositório. A única diferença é um detalhe de espaçamento que não afeta funcionalidade, legibilidade ou manutenção. O LLM demonstrou:

- Compreensão completa do problema
- Conhecimento do padrão de código existente (`deprecatedrole`)
- Capacidade de implementar solução consistente com o codebase
- Atenção a detalhes (JSON message template)
- Abrangência em testes (dpub + fallback + data verification)

Esta é a **segunda solução 100% idêntica** nas 5 issues analisadas (junto com #3934), mostrando que quando o problema é bem definido e há padrões claros no código, o LLM pode produzir soluções indistinguíveis das implementadas por desenvolvedores humanos.
