
interface CorporateBody {
    cin: string; // ICO
    name: string;
    street: string;
    reg_number: string;
    building_number: string;
    city: string;
    postal_code: string;
    formatted_address: string;
    tin?: string; // DIC
    v_tin?: string; // IC DPH
}

export const fetchCompanyData = async (ico: string): Promise<Partial<CorporateBody> | null> => {
    // In a real production app, this should be a Cloud Function to hide API keys/secrets and handle CORS headers properly.
    // For this implementation, we simulate the logic that would exist in that function.

    // We will use a public proxy or direct fetch if CORS allows.
    // slovensko.digital API is the gold standard.

    console.log(`[Cloud Function Logic] Lookup for ICO: ${ico}`);

    // Validate ICO (8 digits check)
    if (!/^\d{8}$/.test(ico)) {
        console.warn("Invalid ICO format");
        return null;
    }

    try {
        // Using a publicly available proxy for demo purposes or direct if supported.
        // NOTE: slovensko.digital requires an API key in headers. 
        // Since we don't have a backend to store secrets safely, we will mock the response 
        // for specific "TEST" ICOs to demonstrate the flow to the user.

        if (ico === '57278784') return {
            cin: '57278784',
            name: 'Garsia s.r.o.',
            street: 'Zeleninová',
            reg_number: '30',
            building_number: '',
            city: 'Bratislava',
            postal_code: '85110',
            formatted_address: 'Zeleninová 30, 851 10 Bratislava',
            tin: '2122650684',
            v_tin: 'SK2122650684'
        };

        // Fallback to a real fetch if we had the endpoint.
        // const response = await fetch(`https://api.slovensko.digital/v1/search?q=${ico}`);

        // Return null for unknown ICOs in this demo environment
        return null;

    } catch (error) {
        console.error("ICO Lookup failed", error);
        return null;
    }
};

export const generateVariableSymbol = (id: number): string => {
    // Format: YYYY + 4 digit sequential ID (e.g., 20260001)
    const year = new Date().getFullYear();
    const sequence = String(id).padStart(4, '0');
    return `${year}${sequence}`;
};
