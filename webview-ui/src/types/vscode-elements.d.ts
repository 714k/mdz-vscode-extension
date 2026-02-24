import type { EventOption, JSX as SolidJSX } from 'solid-js';

// Common event handler types
type ClickHandler = (event: MouseEvent) => void;
type ChangeHandler = (event: Event) => void;
type FocusHandler = (event: FocusEvent) => void;
type KeyboardHandler = (event: KeyboardEvent) => void;

// Common attributes for all vscode elements
interface VscodeCommonAttributes extends SolidJSX.HTMLAttributes<HTMLElement> {
  disabled?: boolean | 'true' | 'false';
  class?: string;
  id?: string;
  title?: string;
  onClick?: ClickHandler;
  onFocus?: FocusHandler;
  onBlur?: FocusHandler;
  onKeydown?: KeyboardHandler;
  onKeyup?: KeyboardHandler;
}

// Button element
interface VscodeButtonAttributes extends VscodeCommonAttributes {
  'appearance'?: 'primary' | 'secondary' | 'icon';
  'autofocus'?: boolean | 'true' | 'false';
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Text Field element
interface VscodeTextFieldAttributes extends VscodeCommonAttributes {
  'type'?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  'placeholder'?: string;
  'value'?: string;
  'readonly'?: boolean | 'true' | 'false';
  'required'?: boolean | 'true' | 'false';
  'autofocus'?: boolean | 'true' | 'false';
  'maxlength'?: number | string;
  'minlength'?: number | string;
  'onChange'?: ChangeHandler;
  'onInput'?: ChangeHandler;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Text Area element
interface VscodeTextAreaAttributes extends VscodeCommonAttributes {
  'placeholder'?: string;
  'value'?: string;
  'readonly'?: boolean | 'true' | 'false';
  'required'?: boolean | 'true' | 'false';
  'autofocus'?: boolean | 'true' | 'false';
  'rows'?: number | string;
  'cols'?: number | string;
  'maxlength'?: number | string;
  'minlength'?: number | string;
  'resize'?: 'none' | 'both' | 'horizontal' | 'vertical';
  'onChange'?: ChangeHandler;
  'onInput'?: ChangeHandler;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Checkbox element
interface VscodeCheckboxAttributes extends VscodeCommonAttributes {
  'checked'?: boolean | 'true' | 'false';
  'readonly'?: boolean | 'true' | 'false';
  'required'?: boolean | 'true' | 'false';
  'indeterminate'?: boolean | 'true' | 'false';
  'onChange'?: ChangeHandler;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Radio element
interface VscodeRadioAttributes extends VscodeCommonAttributes {
  'name'?: string;
  'value'?: string;
  'checked'?: boolean | 'true' | 'false';
  'readonly'?: boolean | 'true' | 'false';
  'required'?: boolean | 'true' | 'false';
  'onChange'?: ChangeHandler;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Radio Group element
interface VscodeRadioGroupAttributes extends VscodeCommonAttributes {
  'name'?: string;
  'value'?: string;
  'orientation'?: 'horizontal' | 'vertical';
  'onChange'?: ChangeHandler;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Dropdown element
interface VscodeDropdownAttributes extends VscodeCommonAttributes {
  'value'?: string;
  'multiple'?: boolean | 'true' | 'false';
  'size'?: number | string;
  'required'?: boolean | 'true' | 'false';
  'onChange'?: ChangeHandler;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Option element
interface VscodeOptionAttributes extends VscodeCommonAttributes {
  value?: string;
  selected?: boolean | 'true' | 'false';
  disabled?: boolean | 'true' | 'false';
}

// Divider element
interface VscodeDividerAttributes extends VscodeCommonAttributes {
  role?: string;
}

// Link element
interface VscodeLinkAttributes extends VscodeCommonAttributes {
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
}

// Tag element
interface VscodeTagAttributes extends VscodeCommonAttributes {}

// Badge element
interface VscodeBadgeAttributes extends VscodeCommonAttributes {}

// Panels element
interface VscodePanelsAttributes extends VscodeCommonAttributes {
  'aria-label'?: string;
}

// Panel Tab element
interface VscodePanelTabAttributes extends VscodeCommonAttributes {}

// Panel View element
interface VscodePanelViewAttributes extends VscodeCommonAttributes {}

// Progress Ring element
interface VscodeProgressRingAttributes extends VscodeCommonAttributes {
  'value'?: number | string;
  'min'?: number | string;
  'max'?: number | string;
  'aria-label'?: string;
  'aria-valuenow'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
}

// Data Grid element
interface VscodeDataGridAttributes extends VscodeCommonAttributes {
  'aria-label'?: string;
  'aria-rowcount'?: number;
  'aria-colcount'?: number;
}

// Data Grid Row element
interface VscodeDataGridRowAttributes extends VscodeCommonAttributes {
  'aria-rowindex'?: number;
}

// Data Grid Cell element
interface VscodeDataGridCellAttributes extends VscodeCommonAttributes {
  'aria-colindex'?: number;
  'grid-column'?: number | string;
}

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'vscode-button': VscodeButtonAttributes;
      'vscode-text-field': VscodeTextFieldAttributes;
      'vscode-text-area': VscodeTextAreaAttributes;
      'vscode-checkbox': VscodeCheckboxAttributes;
      'vscode-radio': VscodeRadioAttributes;
      'vscode-radio-group': VscodeRadioGroupAttributes;
      'vscode-dropdown': VscodeDropdownAttributes;
      'vscode-option': VscodeOptionAttributes;
      'vscode-divider': VscodeDividerAttributes;
      'vscode-link': VscodeLinkAttributes;
      'vscode-tag': VscodeTagAttributes;
      'vscode-badge': VscodeBadgeAttributes;
      'vscode-panels': VscodePanelsAttributes;
      'vscode-panel-tab': VscodePanelTabAttributes;
      'vscode-panel-view': VscodePanelViewAttributes;
      'vscode-progress-ring': VscodeProgressRingAttributes;
      'vscode-data-grid': VscodeDataGridAttributes;
      'vscode-data-grid-row': VscodeDataGridRowAttributes;
      'vscode-data-grid-cell': VscodeDataGridCellAttributes;
    }
  }
}
