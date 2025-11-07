import AbstractVirtualNode from '../../core/base/virtual-node/abstract-virtual-node';
import { getNodeFromTree } from '../../core/utils';
import isHiddenWithCSS from './is-hidden-with-css';

// List of HTML elements that support the 'disabled' attribute
// Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled
const disableableElements = [
  'button',
  'command',
  'fieldset',
  'keygen',
  'optgroup',
  'option',
  'select',
  'textarea',
  'input'
];

/**
 * Check if an element can have the disabled attribute
 * @param {String} nodeName The node name (e.g., 'button', 'a')
 * @return {Boolean} Whether the element supports disabled attribute
 */
function canBeDisabled(nodeName) {
  return disableableElements.includes(nodeName);
}

/**
 * Determines if focusing has been disabled on an element.
 * @param {HTMLElement|VirtualNode} el The HTMLElement
 * @return {Boolean} Whether focusing has been disabled on an element.
 */
function focusDisabled(el) {
  const vNode = el instanceof AbstractVirtualNode ? el : getNodeFromTree(el);

  // Only check disabled attribute if the element type supports it
  // For example, <a href disabled> should not be treated as disabled
  if (canBeDisabled(vNode.props.nodeName) && vNode.hasAttr('disabled')) {
    return true;
  }

  // if a form element is in a legend, that element will not be disabled even if the fieldset is
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset
  let parentNode = vNode.parent;
  const ancestors = [];
  let fieldsetDisabled = false;
  while (
    parentNode &&
    parentNode.shadowId === vNode.shadowId &&
    !fieldsetDisabled
  ) {
    ancestors.push(parentNode);
    if (parentNode.props.nodeName === 'legend') {
      break;
    }

    // use the cached value if one exists and it's from the same shadow tree
    if (parentNode._inDisabledFieldset !== undefined) {
      fieldsetDisabled = parentNode._inDisabledFieldset;
      break;
    }

    if (
      parentNode.props.nodeName === 'fieldset' &&
      parentNode.hasAttr('disabled')
    ) {
      fieldsetDisabled = true;
    }
    parentNode = parentNode.parent;
  }

  // cache whether each element turned out to be in a disabled fieldset so we only have to look at each element once
  ancestors.forEach(
    ancestor => (ancestor._inDisabledFieldset = fieldsetDisabled)
  );
  if (fieldsetDisabled) {
    return true;
  }

  if (vNode.props.nodeName !== 'area') {
    // if the virtual node does not have an actual node, treat it
    // as not hidden
    if (!vNode.actualNode) {
      return false;
    }
    return isHiddenWithCSS(vNode.actualNode);
  }

  return false;
}

export default focusDisabled;
