import { AssetDeclaration, MinistryContact } from "../types";

// Helper to sanitize fields for CSV
const safeStr = (val: any) => {
    if (val === undefined || val === null) return '';
    return `"${String(val).replace(/"/g, '""')}"`;
};

export const exportToCSV = (assets: AssetDeclaration[]) => {
  // Define base headers
  const baseHeaders = [
    'ID', 'Reference', 'MinistryID', 'Type', 'Condition', 
    'Value', 'AcquisitionDate', 'Wilaya', 'Location', 'Lat', 'Lng', 'Description',
    'Spec_Brand', 'Spec_Model', 'Spec_Plate', 'Spec_Surface', 'Spec_Serial',
    'Spec_Material', 'Spec_Dimensions', 'Spec_Manufacturer', 'Spec_Warranty'
  ];

  // Map data to CSV format
  const csvContent = [
    baseHeaders.join(','),
    ...assets.map(asset => {
      const details = asset.specificDetails || {};
      const row = [
        asset.id,
        safeStr(asset.reference),
        asset.ministryId,
        asset.type,
        asset.condition,
        asset.value,
        asset.acquisitionDate,
        asset.wilaya,
        safeStr(asset.locationDetails),
        asset.coordinates?.lat || '',
        asset.coordinates?.lng || '',
        safeStr(asset.description),
        // Specifics flattening (simplified for common fields)
        safeStr(details.brand),
        safeStr(details.model),
        safeStr(details.plateNumber),
        safeStr(details.surfaceArea),
        safeStr(details.serialNumber),
        // New fields
        safeStr(details.material),
        safeStr(details.dimensions),
        safeStr(details.manufacturer),
        safeStr(details.warranty)
      ];
      return row.join(',');
    })
  ].join('\n');

  downloadCSV(csvContent, 'patrimoine_biens_export');
};

export const exportContactsToCSV = (contacts: MinistryContact[]) => {
    const headers = ['ID', 'MinistryFR', 'MinistryAR', 'Representative', 'Phone', 'Email', 'RoleFR', 'Status'];
    
    const csvContent = [
        headers.join(','),
        ...contacts.map(c => [
            c.id,
            safeStr(c.name.fr),
            safeStr(c.name.ar),
            safeStr(c.representative),
            safeStr(c.phone),
            safeStr(c.email),
            safeStr(c.role.fr),
            c.complianceStatus
        ].join(','))
    ].join('\n');

    downloadCSV(csvContent, 'annuaire_contacts_export');
};

const downloadCSV = (content: string, filenamePrefix: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generic CSV Import Parser
export const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return resolve([]);
            
            const lines = text.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            const result = [];
            for(let i = 1; i < lines.length; i++) {
                const currentLine = lines[i];
                // Regex to handle commas inside quotes
                // Matches delimiter (comma, newline, or start) followed by value (quoted or unquoted)
                const regex = /(?:,|\n|^)("(?:(?:""|[^"])*)"|[^",\n]*)/g;
                let matches = null;
                const row = [];
                while ((matches = regex.exec(currentLine)) !== null) {
                     // Check to avoid infinite loop on zero-length matches at end of string
                     if (matches.index === regex.lastIndex) regex.lastIndex++;
                     
                     // The value is in group 1
                     let val = matches[1];
                     
                     if (val) {
                         // Remove surrounding quotes and unescape double quotes
                         if(val.startsWith('"') && val.endsWith('"')) {
                             val = val.slice(1, -1).replace(/""/g, '"');
                         }
                     } else {
                         val = '';
                     }
                     row.push(val);
                }
                
                // Cleanup potentially extra empty match at the end due to how split/regex might behave
                if (row.length > headers.length) row.pop();

                const obj: any = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                result.push(obj);
            }
            resolve(result);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};