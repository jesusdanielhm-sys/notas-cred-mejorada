import requests
import sys
import json
from datetime import datetime

class ExtendedDeliveryNotesAPITester:
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

    def setup_test_data(self):
        """Create test client and delivery note for CRUD operations"""
        print("\n" + "="*50)
        print("SETTING UP TEST DATA")
        print("="*50)
        
        # Create test client
        client_data = {
            "name": "TEST CLIENT FOR CRUD",
            "rif_ci": "J-999888777",
            "address": "Test Address for CRUD Operations",
            "payment_condition": "Test Payment"
        }
        
        success, response = self.run_test(
            "Create Test Client",
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
            
        # Create test delivery note
        note_data = {
            "client_id": self.created_client_id,
            "delivery_location": {
                "address": "Original Test Address",
                "contact_person": "Original Contact",
                "phone": "0000-0000000"
            },
            "products": [
                {
                    "description": "ORIGINAL PRODUCT",
                    "package_unit": "BOX",
                    "package_quantity": 1,
                    "sale_unit": "Unit",
                    "sale_quantity": 10
                }
            ],
            "transport": "Original Transport"
        }
        
        success, response = self.run_test(
            "Create Test Delivery Note",
            "POST",
            "delivery-notes",
            200,
            data=note_data
        )
        
        if success and 'id' in response:
            self.created_note_id = response['id']
            print(f"   Created note ID: {self.created_note_id}")
            return True
        else:
            return False

    def test_delivery_note_update(self):
        """Test updating delivery note (PUT operation)"""
        print("\n" + "="*50)
        print("TESTING DELIVERY NOTE UPDATE")
        print("="*50)
        
        if not self.created_note_id or not self.created_client_id:
            print("❌ Cannot test update without test data")
            return False
            
        # Update delivery note with new data
        update_data = {
            "client_id": self.created_client_id,
            "delivery_location": {
                "address": "UPDATED Test Address",
                "contact_person": "UPDATED Contact Person",
                "phone": "0414-9999999"
            },
            "products": [
                {
                    "description": "UPDATED PRODUCT DESCRIPTION",
                    "package_unit": "UPDATED_BOX",
                    "package_quantity": 5,
                    "sale_unit": "UpdatedUnit",
                    "sale_quantity": 50
                },
                {
                    "description": "NEW ADDED PRODUCT",
                    "package_unit": "NEW_BOX",
                    "package_quantity": 2,
                    "sale_unit": "NewUnit",
                    "sale_quantity": 25
                }
            ],
            "transport": "UPDATED Transport Information"
        }
        
        success, response = self.run_test(
            "Update Delivery Note",
            "PUT",
            f"delivery-notes/{self.created_note_id}",
            200,
            data=update_data
        )
        
        if success:
            # Verify the update by getting the note
            success_get, get_response = self.run_test(
                "Verify Updated Delivery Note",
                "GET",
                f"delivery-notes/{self.created_note_id}",
                200
            )
            
            if success_get:
                # Check if the updates were applied
                delivery_location = get_response.get('delivery_location', {})
                products = get_response.get('products', [])
                transport = get_response.get('transport', '')
                
                print(f"   Updated address: {delivery_location.get('address', 'N/A')}")
                print(f"   Updated contact: {delivery_location.get('contact_person', 'N/A')}")
                print(f"   Updated phone: {delivery_location.get('phone', 'N/A')}")
                print(f"   Updated transport: {transport}")
                print(f"   Number of products: {len(products)}")
                
                # Verify specific updates
                if (delivery_location.get('address') == "UPDATED Test Address" and
                    delivery_location.get('contact_person') == "UPDATED Contact Person" and
                    len(products) == 2 and
                    transport == "UPDATED Transport Information"):
                    print("✅ All updates were applied correctly")
                    return True
                else:
                    print("⚠️  Some updates may not have been applied correctly")
                    return False
            
        return success

    def test_delivery_note_delete(self):
        """Test deleting delivery note (DELETE operation)"""
        print("\n" + "="*50)
        print("TESTING DELIVERY NOTE DELETE")
        print("="*50)
        
        if not self.created_note_id:
            print("❌ Cannot test delete without test data")
            return False
            
        # First verify the note exists
        success_get, _ = self.run_test(
            "Verify Note Exists Before Delete",
            "GET",
            f"delivery-notes/{self.created_note_id}",
            200
        )
        
        if not success_get:
            print("❌ Note doesn't exist before delete test")
            return False
            
        # Delete the delivery note
        success, response = self.run_test(
            "Delete Delivery Note",
            "DELETE",
            f"delivery-notes/{self.created_note_id}",
            200
        )
        
        if success:
            # Verify the note was deleted by trying to get it (should return 404)
            success_verify, _ = self.run_test(
                "Verify Note Deleted",
                "GET",
                f"delivery-notes/{self.created_note_id}",
                404  # Should return 404 Not Found
            )
            
            if success_verify:
                print("✅ Note was successfully deleted")
                return True
            else:
                print("⚠️  Note may not have been deleted properly")
                return False
        
        return success

def main():
    print("🚀 Starting Extended Delivery Notes API Testing (CRUD Operations)")
    print("="*70)
    
    tester = ExtendedDeliveryNotesAPITester()
    
    # Run all tests in sequence
    tests = [
        ("Setup Test Data", tester.setup_test_data),
        ("Delivery Note Update", tester.test_delivery_note_update),
        ("Delivery Note Delete", tester.test_delivery_note_delete),
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
    print("\n" + "="*70)
    print("📊 FINAL EXTENDED TEST RESULTS")
    print("="*70)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if all_passed and tester.tests_passed == tester.tests_run:
        print("🎉 ALL EXTENDED TESTS PASSED! CRUD operations work correctly.")
        return 0
    else:
        print("❌ SOME EXTENDED TESTS FAILED! Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())