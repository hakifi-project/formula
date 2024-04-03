import { ENUM_INSURANCE_SIDE, ENUM_SYMBOL_PREDICTION, InsuranceFormula, PERIOD_UNIT } from '../index';

describe('Valid Formula', () => {
  const insuranceFormula: InsuranceFormula = new InsuranceFormula();

  describe('New Period', () => {
    const listRatioChange = [
      {
        period: 1,
        periodUnit: "hours",
        periodChangeRatio: 0.03
      },
      {
        period: 4,
        periodUnit: "hours",
        periodChangeRatio: 0.0409
      },
      {
        period: 12,
        periodUnit: "hours",
        periodChangeRatio: 0.1823
      },
      {
        period: 1,
        periodUnit: "days",
        periodChangeRatio: 0.0912
      },
      {
        period: 2,
        periodUnit: "days",
        periodChangeRatio: 0.16872
      },
      {
        period: 3,
        periodUnit: "days",
        periodChangeRatio: 0.24624
      },
      {
        period: 4,
        periodUnit: "days",
        periodChangeRatio: 0.32376
      },
      {
        period: 5,
        periodUnit: "days",
        periodChangeRatio: 0.40128
      },
      {
        period: 6,
        periodUnit: "days",
        periodChangeRatio: 0.4788
      },
      {
        period: 7,
        periodUnit: "days",
        periodChangeRatio: 0.55632
      },
      {
        period: 8,
        periodUnit: "days",
        periodChangeRatio: 0.63384
      },
      {
        period: 9,
        periodUnit: "days",
        periodChangeRatio: 0.71136
      },
      {
        period: 10,
        periodUnit: "days",
        periodChangeRatio: 0.78888
      },
      {
        period: 11,
        periodUnit: "days",
        periodChangeRatio: 0.8664
      },
      {
        period: 12,
        periodUnit: "days",
        periodChangeRatio: 0.94392
      },
      {
        period: 13,
        periodUnit: "days",
        periodChangeRatio: 1.02144
      },
      {
        period: 14,
        periodUnit: "days",
        periodChangeRatio: 1.09896
      },
      {
        period: 15,
        periodUnit: "days",
        periodChangeRatio: 1.17648
      }
    ];

    test('should match an available period', () => {
      const availablePeriod = insuranceFormula.getAvailablePeriod(ENUM_INSURANCE_SIDE.BULL, listRatioChange);
      console.log('availablePeriod', availablePeriod)
    });

    test('should match min and max p_claim - BULL', () => {
      const { claim_price_max, claim_price_min } = insuranceFormula.getDistancePClaim({
        p_market: 0.3369,
        list_ratio_change: listRatioChange,
        side: ENUM_INSURANCE_SIDE.BULL,
        signal: ENUM_SYMBOL_PREDICTION.BUY,
        period_change_ratio: 1.09896,
      });

      /*expect(claim_price_max).toEqual(251.6);
      expect(claim_price_min).toEqual(210.8);*/
    });

    test('should match min and max p_claim - BEAR', () => {
      const { claim_price_max, claim_price_min } = insuranceFormula.getDistancePClaim({
        p_market: 0.3369,
        list_ratio_change: listRatioChange,
        side: ENUM_INSURANCE_SIDE.BEAR,
        signal: ENUM_SYMBOL_PREDICTION.BUY,
        period_change_ratio: 1.09896,
      });

      /*expect(claim_price_max).toEqual(180.56);
      expect(claim_price_min).toEqual(107.12);*/
    });

    test('should match p stop', () => {
      const pStop = insuranceFormula.calculatePStop({p_open: 64493.9, p_claim: 70000, hedge: 0.05});
      console.log('pStop', pStop);
      expect(pStop).toEqual(56344.872);
    });

    test('should match q claim', () => {
      const qClaim = insuranceFormula.calculateQClaim({
        margin: 3.75,
        p_claim: 580,
        p_open: 562,
        hedge: 0.05,
        period_unit: PERIOD_UNIT.HOUR,
        day_change_token: 0.022
      });
      console.log('qClaim', qClaim);
      expect(qClaim).toEqual(8.149644128113879);
    });

    test('should match system risk', () => {
      const systemRisk = insuranceFormula.calculateSystemRisk({
        day_change_token: 0.022,
        p_open: 11.943,
        p_stop: 10.37864,
        ratio_profit: 0.08850372603198527
      });
      console.log('systemRisk', systemRisk);
      //expect(systemRisk).toEqual(0.1908607993045079);
    });
  });
});
