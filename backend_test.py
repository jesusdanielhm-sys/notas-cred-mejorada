import requests
import sys
import json
from datetime import datetime

class DeliveryNotesAPITester:
    def __init__(self, base_url="https://invoice-manager-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_client_id = None
        self.created_note_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_company_config(self):
        """Test company configuration endpoints"""
        print("\n" + "="*50)
        print("TESTING COMPANY CONFIGURATION")
        print("="*50)
        
        # Test creating company config
        company_data = {
            "name": "EMPRESA DE PRUEBA S.A.",
            "rif": "J-123456789",
            "address": "Av. Principal, Caracas, Venezuela",
            "phone": "0212-1234567"
        }
        
        success, response = self.run_test(
            "Create Company Config",
            "POST",
            "company-config",
            200,
            data=company_data
        )
        
        if not success:
            return False
            
        # Test getting company config
        success, response = self.run_test(
            "Get Company Config",
            "GET",
            "company-config",
            200
        )
        
        return success

    def test_client_operations(self):
        """Test client CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CLIENT OPERATIONS")
        print("="*50)
        
        # Test creating client with specific test data
        client_data = {
            "name": "CHEMYCALS'L C.A",
            "rif_ci": "J-502964860",
            "address": "CR 36 ENTRE CALLES 23-24 SECTOR BARQUISIMETO CENTRO",
            "payment_condition": "Crédito"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            200,
            data=client_data
        )
        
        if success and 'id' in response:
            self.created_client_id = response['id']
            print(f"   Created client ID: {self.created_client_id}")
        else:
            return False
            
        # Test getting all clients
        success, response = self.run_test(
            "Get All Clients",
            "GET",
            "clients",
            200
        )
        
        if not success:
            return False
            
        # Test getting specific client
        if self.created_client_id:
            success, response = self.run_test(
                "Get Specific Client",
                "GET",
                f"clients/{self.created_client_id}",
                200
            )
            
        return success

    def test_delivery_note_operations(self):
        """Test delivery note CRUD operations"""
        print("\n" + "="*50)
        print("TESTING DELIVERY NOTE OPERATIONS")
        print("="*50)
        
        if not self.created_client_id:
            print("❌ Cannot test delivery notes without a client ID")
            return False
            
        # Test creating delivery note with specific test data
        note_data = {
            "client_id": self.created_client_id,
            "delivery_location": {
                "address": "Zona Industrial Los Ruices, Caracas",
                "contact_person": "Juan Pérez",
                "phone": "0414-1234567"
            },
            "products": [
                {
                    "description": "RESINA ESTIRENO PREFLEX 210",
                    "package_unit": "TAM",
                    "package_quantity": 1,
                    "sale_unit": "Kg",
                    "sale_quantity": 200
                },
                {
                    "description": "TITANIO KIMIX R93",
                    "package_unit": "SAC",
                    "package_quantity": 3,
                    "sale_unit": "Kg",
                    "sale_quantity": 75
                }
            ],
            "transport": "Transporte Terrestre"
        }
        
        success, response = self.run_test(
            "Create Delivery Note",
            "POST",
            "delivery-notes",
            200,
            data=note_data
        )
        
        if success and 'id' in response:
            self.created_note_id = response['id']
            note_number = response.get('note_number', 'N/A')
            print(f"   Created note ID: {self.created_note_id}")
            print(f"   Generated note number: {note_number}")
            
            # Verify automatic numbering (should be J-502964860-001)
            expected_number = "J-502964860-001"
            if note_number == expected_number:
                print(f"✅ Automatic numbering works correctly: {note_number}")
            else:
                print(f"⚠️  Automatic numbering may have issues. Expected: {expected_number}, Got: {note_number}")
        else:
            return False
            
        # Test getting all delivery notes
        success, response = self.run_test(
            "Get All Delivery Notes",
            "GET",
            "delivery-notes",
            200
        )
        
        if not success:
            return False
            
        # Test getting specific delivery note
        if self.created_note_id:
            success, response = self.run_test(
                "Get Specific Delivery Note",
                "GET",
                f"delivery-notes/{self.created_note_id}",
                200
            )
            
        return success

    def test_statistics(self):
        """Test statistics endpoint"""
        print("\n" + "="*50)
        print("TESTING STATISTICS")
        print("="*50)
        
        success, response = self.run_test(
            "Get Statistics",
            "GET",
            "statistics",
            200
        )
        
        if success:
            total_notes = response.get('total_notes', 0)
            total_clients = response.get('total_clients', 0)
            notes_by_client = response.get('notes_by_client', [])
            
            print(f"   Total notes: {total_notes}")
            print(f"   Total clients: {total_clients}")
            print(f"   Notes by client: {len(notes_by_client)} entries")
            
            # Verify we have at least the data we created
            if total_notes >= 1 and total_clients >= 1:
                print("✅ Statistics show expected data")
            else:
                print("⚠️  Statistics may not reflect created data")
                
        return success

    def test_additional_delivery_note(self):
        """Test creating a second delivery note to verify numbering increment"""
        print("\n" + "="*50)
        print("TESTING AUTOMATIC NUMBERING INCREMENT")
        print("="*50)
        
        if not self.created_client_id:
            print("❌ Cannot test without a client ID")
            return False
            
        # Create second delivery note
        note_data = {
            "client_id": self.created_client_id,
            "delivery_location": {
                "address": "Otra dirección de entrega",
                "contact_person": "María González",
                "phone": "0424-7654321"
            },
            "products": [
                {
                    "description": "PRODUCTO DE PRUEBA",
                    "package_unit": "UND",
                    "package_quantity": 5,
                    "sale_unit": "Pcs",
                    "sale_quantity": 100
                }
            ],
            "transport": "Transporte Aéreo"
        }
        
        success, response = self.run_test(
            "Create Second Delivery Note",
            "POST",
            "delivery-notes",
            200,
            data=note_data
        )
        
        if success:
            note_number = response.get('note_number', 'N/A')
            print(f"   Second note number: {note_number}")
            
            # Should be J-502964860-002
            expected_number = "J-502964860-002"
            if note_number == expected_number:
                print(f"✅ Automatic numbering increment works correctly: {note_number}")
            else:
                print(f"⚠️  Automatic numbering increment may have issues. Expected: {expected_number}, Got: {note_number}")
                
        return success

def main():
    print("🚀 Starting Delivery Notes API Testing")
    print("="*60)
    
    tester = DeliveryNotesAPITester()
    
    # Run all tests in sequence
    tests = [
        ("Company Configuration", tester.test_company_config),
        ("Client Operations", tester.test_client_operations),
        ("Delivery Note Operations", tester.test_delivery_note_operations),
        ("Statistics", tester.test_statistics),
        ("Automatic Numbering Increment", tester.test_additional_delivery_note),
    ]
    
    all_passed = True
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name} tests...")
        try:
            result = test_func()
            if not result:
                all_passed = False
                print(f"❌ {test_name} tests failed")
            else:
                print(f"✅ {test_name} tests passed")
        except Exception as e:
            all_passed = False
            print(f"❌ {test_name} tests failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL TEST RESULTS")
    print("="*60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if all_passed and tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        return 0
    else:
        print("❌ SOME TESTS FAILED! Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())