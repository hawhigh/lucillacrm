import { Invoice } from '../types';

export const generatePohodaXML = (invoices: Invoice[]): string => {
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<dat:dataPack id="fa001" ico="00000000" application="Lucilla" version="2.0" note="Import" xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd" xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd" xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">`;

  invoices.forEach(inv => {
    xml += `
    <dat:dataPackItem id="${inv.id}" version="2.0">
      <inv:invoice version="2.0">
        <inv:invoiceHeader>
          <inv:invoiceType>issuedInvoice</inv:invoiceType>
          <inv:number>
            <typ:numberRequested>${inv.number}</typ:numberRequested>
          </inv:number>
          <inv:date>${inv.issueDate}</inv:date>
          <inv:dateTax>${inv.issueDate}</inv:dateTax>
          <inv:dateDue>${inv.dueDate}</inv:dateDue>
          <inv:text>Invoice ${inv.number}</inv:text>
          <inv:partnerIdentity>
            <typ:address>
              <typ:company>${inv.customer.name}</typ:company>
              <typ:city>${inv.customer.city}</typ:city>
              <typ:street>${inv.customer.addressLine1}</typ:street>
              <typ:zip>${inv.customer.zip}</typ:zip>
              <typ:ico>${inv.customer.ico}</typ:ico>
              <typ:dic>${inv.customer.dic}</typ:dic>
              <typ:icDph>${inv.customer.icDph}</typ:icDph>
            </typ:address>
          </inv:partnerIdentity>
        </inv:invoiceHeader>
        <inv:invoiceDetail>`;

    inv.items.forEach(item => {
      xml += `
          <inv:invoiceItem>
            <inv:text>${item.description}</inv:text>
            <inv:quantity>${item.quantity}</inv:quantity>
            <inv:unit>${item.unit}</inv:unit>
            <inv:rateVAT>${item.vatRate === 20 ? 'high' : item.vatRate === 10 ? 'low' : 'none'}</inv:rateVAT>
            <inv:homeCurrency>
              <typ:unitPrice>${item.unitPrice}</typ:unitPrice>
            </inv:homeCurrency>
          </inv:invoiceItem>`;
    });

    xml += `
        </inv:invoiceDetail>
      </inv:invoice>
    </dat:dataPackItem>`;
  });

  xml += `
</dat:dataPack>`;

  return xml;
};

export const generateISDOC = (inv: Invoice): string => {
  // Simplified ISDOC generation
  const total = inv.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice * (1 + i.vatRate / 100)), 0);
  const taxTotal = inv.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice * (i.vatRate / 100)), 0);
  const netTotal = inv.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.1">
  <DocumentType>1</DocumentType>
  <ID>${inv.number}</ID>
  <IssuingSystem>Lucilla</IssuingSystem>
  <IssueDate>${inv.issueDate}</IssueDate>
  <TaxPointDate>${inv.issueDate}</TaxPointDate>
  <LocalCurrencyCode>EUR</LocalCurrencyCode>
  <CurrRate>1</CurrRate>
  <RefCurrRate>1</RefCurrRate>
  
  <AccountingSupplierParty>
    <Party>
      <PartyName><Name>${inv.supplier.name}</Name></PartyName>
      <PartyIdentification><ID>${inv.supplier.ico}</ID></PartyIdentification>
      <PostalAddress>
        <StreetName>${inv.supplier.addressLine1}</StreetName>
        <CityName>${inv.supplier.city}</CityName>
        <PostalZone>${inv.supplier.zip}</PostalZone>
        <Country><IdentificationCode>${inv.supplier.country === 'Slovensko' ? 'SK' : 'SK'}</IdentificationCode><Name>${inv.supplier.country}</Name></Country>
      </PostalAddress>
    </Party>
  </AccountingSupplierParty>

  <AccountingCustomerParty>
    <Party>
      <PartyName><Name>${inv.customer.name}</Name></PartyName>
      <PartyIdentification><ID>${inv.customer.ico}</ID></PartyIdentification>
      <PostalAddress>
        <StreetName>${inv.customer.addressLine1}</StreetName>
        <CityName>${inv.customer.city}</CityName>
        <PostalZone>${inv.customer.zip}</PostalZone>
        <Country><IdentificationCode>SK</IdentificationCode><Name>${inv.customer.country}</Name></Country>
      </PostalAddress>
    </Party>
  </AccountingCustomerParty>

  <InvoiceLines>
    ${inv.items.map((item, idx) => `
    <InvoiceLine>
      <ID>${idx + 1}</ID>
      <Item><Description>${item.description}</Description></Item>
      <InvoicedQuantity unitCode="${item.unit}">${item.quantity}</InvoicedQuantity>
      <UnitPrice>${item.unitPrice}</UnitPrice>
      <UnitPriceTaxInclusive>${item.unitPrice * (1 + item.vatRate / 100)}</UnitPriceTaxInclusive>
      <LineExtensionAmount>${item.quantity * item.unitPrice}</LineExtensionAmount>
      <LineExtensionAmountTaxInclusive>${item.quantity * item.unitPrice * (1 + item.vatRate / 100)}</LineExtensionAmountTaxInclusive>
      <ClassifiedTaxCategory>
        <Percent>${item.vatRate}</Percent>
        <VATCalculationMethod>1</VATCalculationMethod>
      </ClassifiedTaxCategory>
    </InvoiceLine>
    `).join('')}
  </InvoiceLines>

  <TaxTotal>
    <TaxSubTotal>
      <TaxableAmount>${netTotal.toFixed(2)}</TaxableAmount>
      <TaxAmount>${taxTotal.toFixed(2)}</TaxAmount>
      <TaxInclusiveAmount>${total.toFixed(2)}</TaxInclusiveAmount>
      <AlreadyClaimedTaxableAmount>0</AlreadyClaimedTaxableAmount>
      <AlreadyClaimedTaxAmount>0</AlreadyClaimedTaxAmount>
      <AlreadyClaimedTaxInclusiveAmount>0</AlreadyClaimedTaxInclusiveAmount>
      <DifferenceTaxableAmount>${netTotal.toFixed(2)}</DifferenceTaxableAmount>
      <DifferenceTaxAmount>${taxTotal.toFixed(2)}</DifferenceTaxAmount>
      <DifferenceTaxInclusiveAmount>${total.toFixed(2)}</DifferenceTaxInclusiveAmount>
      <TaxCategory>
        <Percent>20</Percent>
      </TaxCategory>
    </TaxSubTotal>
    <TaxAmount>${taxTotal.toFixed(2)}</TaxAmount>
  </TaxTotal>

  <LegalMonetaryTotal>
    <TaxExclusiveAmount>${netTotal.toFixed(2)}</TaxExclusiveAmount>
    <TaxInclusiveAmount>${total.toFixed(2)}</TaxInclusiveAmount>
    <AlreadyPaidAmount>0</AlreadyPaidAmount>
    <PayableAmount>${total.toFixed(2)}</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`;
};
