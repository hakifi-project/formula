import Big from 'big.js';
import CONFIG from './constants';
import {
  ENUM_INSURANCE_SIDE,
  ENUM_SYMBOL_PREDICTION,
  PERIOD_UNIT,
  TCalDiffClaim,
  TCalExpired,
  TCalPStop,
  TCalQClaim,
  TCalQuantityFuture,
  TCalRatioPredict,
  TCalSystemCapital,
  TCalSystemRisk,
  TGetDistancePClaim,
  TListRatioChange,
} from './types';

export class InsuranceFormula {
  public risk_config: number;
  public refund_ratio: number;
  public min_period: number;
  public max_period: number;
  public constant_claim: number;
  public ratio_different_price_claim: number;

  constructor() {
    this.refund_ratio = CONFIG.REFUND_RATIO;
    this.risk_config = CONFIG.RISK_CONFIG;
    this.min_period = CONFIG.MIN_PERIOD;
    this.max_period = CONFIG.MAX_PERIOD;
    this.ratio_different_price_claim = CONFIG.RATIO_DIFFERENT_PRICE_CLAIM;
    this.constant_claim = 1;
  }

  public calculateSystemRisk(params: TCalSystemRisk) {
    const { day_change_token, ratio_profit } = params;
    const diff_stop = this.getDiffStop(ratio_profit);
    const percent_p_expired = Big(ratio_profit).mul(diff_stop);

    return Big(day_change_token).div(percent_p_expired).toNumber();
  }

  public calculateSystemCapital(params: TCalSystemCapital) {
    const { p_stop, p_open, day_change_token, ratio_profit, margin } = params;
    const system_risk = this.calculateSystemRisk({ p_stop, p_open, day_change_token, ratio_profit });

    if (Big(system_risk).gt(this.risk_config)) {
      return Big(margin).times(this.risk_config).div(system_risk).toNumber();
    } else {
      return Big(margin).plus(Big(this.risk_config).minus(system_risk).times(margin)).toNumber();
    }
  }

  public calculateRatioPredict(params: TCalRatioPredict) {
    const { p_open, p_claim } = params;
    return Big(p_claim).minus(p_open).abs().div(p_open).toNumber();
  }

  public getDiffStop(ratio_profit: number) {
    if (ratio_profit <= 0.04) {
      return 1.5;
    } else if (ratio_profit <= 0.1 && ratio_profit > 0.04) {
      return 1.48;
    } else if (ratio_profit < 0.5 && ratio_profit > 0.1) {
      return 1.45;
    }
    return 1;
  }

  public calculatePStop = ({ p_open, p_claim }: TCalPStop): number => {
    const ratio_profit = this.calculateRatioPredict({ p_open, p_claim });
    const diff_stop = this.getDiffStop(ratio_profit);
    let p_stop: number;

    if (Big(p_claim).gt(p_open)) {
      p_stop = Big(p_open)
        .minus(Big(p_open).times(Big(ratio_profit)).times(diff_stop))
        .toNumber();
    } else {
      p_stop = Big(p_open)
        .plus(Big(p_open).times(Big(ratio_profit)).times(diff_stop))
        .toNumber();
    }
    return p_stop;
  };

  public calculateLeverage(ratio_profit: number) {
    const diff_stop = this.getDiffStop(ratio_profit);
    const percent_p_expired = Big(ratio_profit).mul(diff_stop).toNumber();
    return Math.floor(1 / percent_p_expired);
  }

  public calculateQClaim({ margin, p_open, p_claim, hedge, day_change_token, period_unit }: TCalQClaim) {
    const p_stop = this.calculatePStop({ p_open, p_claim, hedge });
    const ratio_profit = this.calculateRatioPredict({
      p_claim,
      p_open,
    });
    const user_capital = margin;
    const system_capital = this.calculateSystemCapital({
      margin,
      p_stop,
      p_open,
      day_change_token,
      ratio_profit,
    });
    const hedge_capital = Big(user_capital).add(system_capital).toNumber();
    const leverage = this.calculateLeverage(ratio_profit);
    const profit = Big(ratio_profit).times(hedge_capital).times(leverage).toNumber();
    const ratio = (period_unit === PERIOD_UNIT.HOUR ? CONFIG.Q_CLAIM_CONFIG_HOUR : CONFIG.Q_CLAIM_CONFIG_DAY).reduce(
      (prev, curr) => {
        const currHedge = Big(curr.hedge).minus(hedge).abs();
        const prevHedge = Big(prev.hedge).minus(hedge).abs();
        return Big(currHedge).lt(prevHedge) ? curr : prev;
      },
    );
    const diff_claim = this.calculateDiffClaim({ ratio_profit });
    return Big(profit)
      .times(Big(1).minus(diff_claim))
      .times(Big(1).minus(ratio.x))
      .plus(margin)
      .toNumber();
  }

  public calculatePRefund(p_open: number, p_claim: number) {
    const isBull = Big(p_claim).gt(p_open);
    return Number(Big(p_open).times(isBull ? 1 + this.refund_ratio : 1 - this.refund_ratio));
  }

  public calculateHedge(number1: number, number2: number) {
    return Big(number1).div(number2).toNumber();
  }

  public calculateQuantityFuture({ p_open, p_claim, hedge, margin, day_change_token }: TCalQuantityFuture) {
    const p_stop = this.calculatePStop({ p_open, p_claim, hedge });
    const leverage = Math.floor(p_open / Math.abs(p_open - p_stop));
    const user_capital = margin;
    const ratio_profit = Big(p_claim).minus(p_open).abs().div(p_open).toNumber();
    const system_capital = this.calculateSystemCapital({
      margin,
      p_stop,
      p_open,
      day_change_token,
      ratio_profit,
    });
    const hedge_capital = Big(user_capital).plus(system_capital);
    const qty = hedge_capital.times(leverage).div(p_open).toNumber();
    return qty;
  }

  public calculateExpired(params: TCalExpired): number {
    const { period, period_unit } = params;
    let expired: number;
    switch (period_unit) {
      case PERIOD_UNIT.DAY:
        expired = new Date(
          new Date().getTime() + parseInt(period as unknown as string) * 60 * 60 * 1000 * 24,
        ).getTime();
        break;
      case PERIOD_UNIT.HOUR:
        expired = new Date(new Date().getTime() + parseInt(period as unknown as string) * 60 * 60 * 1000).getTime();
        break;
    }
    return expired;
  }

  public getAvailablePeriod(side: string, list_ratio_change: Array<TListRatioChange>) {
    if (side === ENUM_INSURANCE_SIDE.BEAR) {
      return list_ratio_change.filter(item => {
        return item.periodChangeRatio < 1;
      });
    }

    return list_ratio_change;
  }

  public getDistancePClaim(params: TGetDistancePClaim) {
    const { p_market, list_ratio_change, side, signal, period_change_ratio } = params;
    let sort_list_avg = list_ratio_change.map(item => {
      return item.periodChangeRatio
    }).sort();
    sort_list_avg = sort_list_avg.filter((v) => v >= period_change_ratio);
    //Filter list avg remove ratio >= 1
    const filter_sort_list_avg = sort_list_avg.filter((v) => v < 1);

    let claim_price_min = 0, claim_price_max = 0;
    if (signal === ENUM_SYMBOL_PREDICTION.BUY) {
      if (side === ENUM_INSURANCE_SIDE.BULL) {
        claim_price_min = Big(this.constant_claim).plus(this._filterRatioDifferentPriceClaim(sort_list_avg[0], 0.5)).times(p_market).toNumber();
        claim_price_max = Big(this.constant_claim).plus(this._filterRatioDifferentPriceClaim(sort_list_avg[sort_list_avg.length - 1], 0.5)).times(p_market).toNumber();
      } else if (side === ENUM_INSURANCE_SIDE.BEAR) {
        //Can check so max < 1
        claim_price_min = filter_sort_list_avg && filter_sort_list_avg.length > 0 ? Big(this.constant_claim).minus(this._filterRatioDifferentPriceClaim(filter_sort_list_avg[filter_sort_list_avg.length - 1], 0.75)).times(p_market).toNumber() : 0;
        claim_price_max = Big(this.constant_claim).minus(this._filterRatioDifferentPriceClaim(sort_list_avg[0], 0.75)).times(p_market).toNumber();
      }
    } else if (signal === ENUM_SYMBOL_PREDICTION.SELL) {
      if (side === ENUM_INSURANCE_SIDE.BULL) {
        claim_price_min = Big(this.constant_claim).plus(this._filterRatioDifferentPriceClaim(sort_list_avg[0], 0.75)).times(p_market).toNumber();
        claim_price_max = Big(this.constant_claim).plus(this._filterRatioDifferentPriceClaim(sort_list_avg[sort_list_avg.length - 1], 0.75)).times(p_market).toNumber();
      } else if (side === ENUM_INSURANCE_SIDE.BEAR) {
        //Can check so max < 1
        claim_price_min = filter_sort_list_avg && filter_sort_list_avg.length > 0 ? Big(this.constant_claim).minus(this._filterRatioDifferentPriceClaim(filter_sort_list_avg[filter_sort_list_avg.length - 1], 0.5)).times(p_market).toNumber() : 0;
        claim_price_max = Big(this.constant_claim).minus(this._filterRatioDifferentPriceClaim(sort_list_avg[0], 0.5)).times(p_market).toNumber();
      }
    } else {
      if (side === ENUM_INSURANCE_SIDE.BULL) {
        claim_price_min = Big(this.constant_claim).plus(this._filterRatioDifferentPriceClaim(sort_list_avg[0])).times(p_market).toNumber();
        claim_price_max = Big(this.constant_claim).plus(this._filterRatioDifferentPriceClaim(sort_list_avg[sort_list_avg.length - 1])).times(p_market).toNumber();
      } else if (side === ENUM_INSURANCE_SIDE.BEAR) {
        //Can check so max < 1
        claim_price_min = filter_sort_list_avg && filter_sort_list_avg.length > 0 ? Big(this.constant_claim).minus(this._filterRatioDifferentPriceClaim(filter_sort_list_avg[filter_sort_list_avg.length - 1])).times(p_market).toNumber() : 0;
        claim_price_max = Big(this.constant_claim).minus(this._filterRatioDifferentPriceClaim(sort_list_avg[0])).times(p_market).toNumber();
      }
    }

    return { claim_price_min, claim_price_max };
  }

  private _filterRatioDifferentPriceClaim(avg_change: number, time = 1) {
    const calc = Big(avg_change).times(time);
    return Big(this.ratio_different_price_claim).gt(calc) ? this.ratio_different_price_claim : calc;
  }

  public calculateDiffClaim(params: TCalDiffClaim) {
    const { ratio_profit } = params;
    return ratio_profit <= 0.04 ? 0.25 : 0.2;
  }
}
