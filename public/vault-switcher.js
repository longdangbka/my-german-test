// Quick vault switcher for testing
// This script helps switch to the test vault directory

console.log('🔧 Vault Switcher - Switching to test vault directory');

// Path to the test vault
const testVaultPath = String.raw`C:\Users\HOANG PHI LONG DANG\REACT CODE\App\my-german-test\my-test-vault - Copy`;

console.log('Test vault path:', testVaultPath);

// If we're in Electron environment, we can use the vault selection
if (window.electron && window.electron.selectVaultFolder) {
  console.log('✅ Electron environment detected');
  console.log('📁 You can use the vault folder selection in the UI');
  console.log('   Or manually point to:', testVaultPath);
} else {
  console.log('🌐 Web environment - vault path is fixed to /vault/');
}

// Function to help with manual vault switching (for debug)
window.switchToTestVault = async () => {
  if (window.electron && window.electron.selectVaultFolder) {
    try {
      const result = await window.electron.selectVaultFolder();
      console.log('Vault selection result:', result);
      window.location.reload(); // Reload to pick up new vault
    } catch (error) {
      console.error('Error selecting vault:', error);
    }
  } else {
    console.log('Vault switching only available in Electron environment');
  }
};

console.log('💡 Run switchToTestVault() in console to open vault selector');
