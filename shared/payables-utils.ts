// Agreement type to bill type mapping
export const AGREEMENT_TO_BILL_TYPE: Record<string, string> = {
    "Rent Agreement": "Rent Invoice",
    "KSEB Agreement": "Electricity Bill",
    "Water Bill Agreement": "Water Bill",
    "Maintenance Agreement": "Maintenance Bill",
    "Internet Agreement": "Internet Bill",
    "Security Agreement": "Security Bill",
};

// Validation helpers
export function isWithin90Days(billDate: string): boolean {
    const date = new Date(billDate);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return date >= ninetyDaysAgo && date <= new Date();
}

export function getMonthYear(date: string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
