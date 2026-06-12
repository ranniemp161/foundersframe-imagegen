export type Scene = {
  id: string;
  timestamp: string;
  concept: string;
  needsText: boolean;
  textLabel: string;
  hasCharacter: boolean;
  imagePrompt: string;
};

export type ImgState = {
  status: "idle" | "loading" | "done" | "error";
  dataUrl?: string;
  error?: string;
};

export type ImageModel = {
  key: string;
  label: string;
  priceNote: string;
  price: number;
  desc: string;
};
