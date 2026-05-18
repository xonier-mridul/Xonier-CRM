
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from app.db.models.plan_model import PlanModel
from app.core.enums import BILLING_CYCLE, SUBSCRIPTION_STATUS, DISCOUNT_TYPE


def calculate_price(plan: PlanModel, billing_cycle: BILLING_CYCLE) -> Tuple[float, float, float]:
   
    base_price = (
        plan.price.monthlyPrice
        if billing_cycle == BILLING_CYCLE.MONTHLY
        else plan.price.yearlyPrice
    )

    if not plan.discount or not plan.discountApply:
        return base_price, 0.0, base_price

    applies = (
        plan.discountApply == "both"
        or (plan.discountApply == "monthly" and billing_cycle == BILLING_CYCLE.MONTHLY)
        or (plan.discountApply == "yearly" and billing_cycle == BILLING_CYCLE.YEARLY)
    )

    if not applies:
        return base_price, 0.0, base_price

    if plan.discountTill:
        discount_till = plan.discountTill
        if discount_till.tzinfo is None:
            discount_till = discount_till.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > discount_till:
            return base_price, 0.0, base_price

    if plan.discountType == DISCOUNT_TYPE.PERCENTAGE:
        discount_amount = round(base_price * (plan.discount / 100), 2)
    else:
        discount_amount = min(round(plan.discount, 2), base_price)

    final_price = round(base_price - discount_amount, 2)
    return base_price, discount_amount, final_price


def calculate_subscription_dates(
    plan: PlanModel,
    billing_cycle: BILLING_CYCLE,
    now: datetime,
) -> Tuple[datetime, Optional[datetime], Optional[datetime], Optional[datetime], SUBSCRIPTION_STATUS]:
   
    has_trial = plan.trial_days and plan.trial_days > 0

    if has_trial:
        trial_start = now
        trial_end = now + timedelta(days=plan.trial_days)
        start_date = trial_end
        end_date = (
            trial_end + timedelta(days=30)
            if billing_cycle == BILLING_CYCLE.MONTHLY
            else trial_end + timedelta(days=365)
        )
        return start_date, end_date, trial_start, trial_end, SUBSCRIPTION_STATUS.ACTIVE

    start_date = now
    end_date = (
        now + timedelta(days=30)
        if billing_cycle == BILLING_CYCLE.MONTHLY
        else now + timedelta(days=365)
    )
    return start_date, end_date, None, None, SUBSCRIPTION_STATUS.ACTIVE