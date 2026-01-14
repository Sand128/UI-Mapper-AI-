
export enum UIComponentType {
  HEADER = 'Header',
  NAVIGATION = 'Navigation',
  BUTTON = 'Button',
  ICON = 'Icon',
  INPUT = 'Input',
  SELECT = 'Select',
  FORM = 'Form',
  CARD = 'Card',
  MODAL = 'Modal',
  FOOTER = 'Footer',
  TEXT = 'TextBlock',
  IMAGE = 'Image',
  OTHER = 'Other'
}

export interface BoundingBox {
  ymin: number; // 0-1000
  xmin: number; // 0-1000
  ymax: number; // 0-1000
  xmax: number; // 0-1000
}

export interface UIComponent {
  id: string;
  label: string;
  type: UIComponentType;
  description: string;
  box_2d: BoundingBox;
}

export interface Screenshot {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  components: UIComponent[];
  analyzed: boolean;
}

export interface Project {
  id: string;
  name: string;
  screenshots: Screenshot[];
  createdAt: number;
}
