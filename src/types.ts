export type TCalDiffClaim = {
  ratio_profit: number;
};

export type TCalSystemRisk = {
  p_stop: number;
  p_open: number;
  day_change_token: number;
  ratio_profit: number;
};

export type TCalSystemCapital = {
  margin: number;
  p_stop: number;
  p_open: number;
  day_change_token: number;
  ratio_profit: number;
};
export type TCalRatioPredict = {
  p_claim: number;
  p_open: number;
};

export type TCalPStop = {
  p_open: number;
  p_claim: number;
  hedge: number;
};

export enum PERIOD_UNIT {
  DAY = 'days',
  HOUR = 'hours',
}

export type TCalQClaim = {
  margin: number;
  p_open: number;
  p_claim: number;
  hedge: number;
  day_change_token: number;
  period_unit: PERIOD_UNIT;
};

export type TCalQuantityFuture = {
  margin: number;
  p_open: number;
  p_claim: number;
  hedge: number;
  day_change_token: number;
};

export type TCalExpired = {
  period: number;
  period_unit: PERIOD_UNIT;
};

export type TGetDistancePClaim = {
  p_market: number;
  list_ratio_change: Array<TListRatioChange>;
  side: ENUM_INSURANCE_SIDE;
  signal?: ENUM_SYMBOL_PREDICTION;
  period_change_ratio: number;
};

export type TListRatioChange = {
  period: number,
  periodUnit: string,
  periodChangeRatio: number,
}

export enum ENUM_INSURANCE_SIDE {
  BULL = 'BULL',
  BEAR = 'BEAR',
}

export enum ENUM_SYMBOL_PREDICTION {
  BUY = 'BUY',
  SELL = 'SELL',
  IS_NULL = ''
}
