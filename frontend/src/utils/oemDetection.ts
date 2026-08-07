/**
 * User-Agent Client Hints and UA parser for detecting OEM Android brands
 * with aggressive background app killer policies (dontkillmyapp.com).
 */

export interface OemInfo {
  isAndroid: boolean;
  brand: string;
  oemName: string;
  unwhitelistUrl: string;
  advice: string;
}

interface NavigatorUAData {
  brands?: Array<{ brand: string; version: string }>;
}

export function detectOemBrand(): OemInfo {
  const ua = (navigator.userAgent || '').toLowerCase();
  const isAndroid = /android/i.test(ua);

  let brand = 'Unknown Android';
  let oemName = 'Generic';
  let unwhitelistUrl = 'https://dontkillmyapp.com';
  let advice =
    'Please disable battery optimizations for Placement Tracker in your device settings.';

  // Check navigator.userAgentData if available
  let uaBrands: string[] = [];
  const navData = (navigator as unknown as { userAgentData?: NavigatorUAData }).userAgentData;
  if (navData && navData.brands) {
    uaBrands = navData.brands.map((b) => b.brand.toLowerCase());
  }

  const matchesBrand = (keyword: string) =>
    ua.includes(keyword) || uaBrands.some((b) => b.includes(keyword));

  if (matchesBrand('samsung')) {
    brand = 'Samsung';
    oemName = 'Samsung One UI';
    unwhitelistUrl = 'https://dontkillmyapp.com/samsung';
    advice =
      'Go to Settings > Apps > Placement Tracker > Battery > Choose "Unrestricted" to ensure background deadline push notifications arrive reliably.';
  } else if (matchesBrand('xiaomi') || matchesBrand('redmi') || matchesBrand('poco') || ua.includes('miui')) {
    brand = 'Xiaomi';
    oemName = 'Xiaomi MIUI / HyperOS';
    unwhitelistUrl = 'https://dontkillmyapp.com/xiaomi';
    advice =
      'Enable "Autostart" in App Info and set Battery Saver to "No restrictions".';
  } else if (matchesBrand('oppo') || matchesBrand('coloros')) {
    brand = 'Oppo';
    oemName = 'Oppo ColorOS';
    unwhitelistUrl = 'https://dontkillmyapp.com/oppo';
    advice =
      'Allow "Background activity" and lock Placement Tracker in the recent apps task switcher.';
  } else if (matchesBrand('vivo') || matchesBrand('funtouch') || matchesBrand('originos')) {
    brand = 'Vivo';
    oemName = 'Vivo FuntouchOS';
    unwhitelistUrl = 'https://dontkillmyapp.com/vivo';
    advice =
      'Go to Settings > Battery > High background power consumption > Enable for Placement Tracker.';
  } else if (matchesBrand('oneplus')) {
    brand = 'OnePlus';
    oemName = 'OnePlus OxygenOS';
    unwhitelistUrl = 'https://dontkillmyapp.com/oneplus';
    advice =
      'Go to Settings > Battery > Battery Optimization > Placement Tracker > "Don\'t optimize".';
  } else if (matchesBrand('realme')) {
    brand = 'Realme';
    oemName = 'Realme UI';
    unwhitelistUrl = 'https://dontkillmyapp.com/realme';
    advice =
      'Allow background activity under App Info > Battery usage.';
  } else if (matchesBrand('huawei') || matchesBrand('honor') || matchesBrand('emui')) {
    brand = 'Huawei';
    oemName = 'Huawei EMUI';
    unwhitelistUrl = 'https://dontkillmyapp.com/huawei';
    advice =
      'Go to Settings > Battery > App Launch > Placement Tracker > Manage manually (enable Auto-launch & Secondary launch).';
  }

  return {
    isAndroid,
    brand,
    oemName,
    unwhitelistUrl,
    advice,
  };
}
