// Initialize i18next
i18next
  .use(i18nextHttpBackend)
  .use(i18nextBrowserLanguageDetector)
  .init({
    fallbackLng: 'en',
    debug: false,
    detection: {
      order: ['querystring', 'navigator', 'localStorage', 'htmlTag'],
      lookupQuerystring: 'lng',
      caches: ['localStorage'],
      cookieMinutes: 10080 // 7 days
    },
    backend: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
    },
    ns: ['translation'],
    defaultNS: 'translation'
  }, function(err, t) {
    jqueryI18next.init(i18next, $, {
      tName: 't',
      i18nName: 'i18n',
      handleName: 'localize',
      selectorAttr: 'data-i18n',
      targetAttr: 'i18n-target',
      optionsAttr: 'i18n-options',
      useOptionsAttr: false,
      parseDefaultValueFromContent: true
    });
    
    $(document).localize();
    initializeApp();
  });

// Main application code
function initializeApp() {
  import("https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js").then((firebaseApp) => {
    import("https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js").then((firebaseDatabase) => {
      import("https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js").then((firebaseAuth) => {
        const { initializeApp } = firebaseApp;
        const { getDatabase, ref, push, remove, get, set, onValue, update, query, orderByChild, equalTo } = firebaseDatabase;
        const { getAuth, signInAnonymously } = firebaseAuth;

        const firebaseConfig = {
          apiKey: "AIzaSyCrPKQOqw4zciASa_5PbI_etfkvrBaDPDI",
          authDomain: "genz-abb36.firebaseapp.com",
          databaseURL: "https://genz-abb36-default-rtdb.firebaseio.com",
          projectId: "genz-abb36",
          storageBucket: "genz-abb36.firebasestorage.app",
          messagingSenderId: "405021535683",
          appId: "1:405021535683:web:ee5a28fde27f5558046176",
          measurementId: "G-XZNQND2J00"
        };
        const app = initializeApp(firebaseConfig);
        const database = getDatabase(app);
        const auth = getAuth(app);
        
        let userBirthdate = null;
        let userCountry = null;
        let userGender = null;
        let userWantsMonetization = null;
        let dataSubmitted = false;
        let userBirthdayDay = null;
        let userBirthdayMonth = null;
        let lastSubmittedId = null;
        let userUid = null;
        let userAccessCode = null;
        let userFlowerCode = null;
        let userBirthdayStats = {
          totalMembers: 0,
          userRank: 0,
          formattedDate: ""
        };
        let userCountryStats = {
          totalMembers: 0
        };
        let currentMotivation = null;
        let tempSelectedGender = null;
        let userBirthYear = null;
        let currentLanguage = i18next.language || 'en';

        const submitButton = document.querySelector('.submit-button');

        function generatePersonalizedMotivation(flowerCode) {
          if (!flowerCode || flowerCode.length < 8) {
            return i18next.t('flower.defaultMotivation');
          }
          
          const positiveTraits = i18next.t('flower.positiveTraits', { returnObjects: true });
          const encouragements = i18next.t('flower.encouragements', { returnObjects: true });
          const transitions = i18next.t('flower.transitions', { returnObjects: true });
          
          const codeSum = flowerCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
          const traitIndex = codeSum % positiveTraits.length;
          const encourageIndex = (codeSum + 3) % encouragements.length;
          const transitionIndex = (codeSum + 7) % transitions.length;
          
          return positiveTraits[traitIndex] + transitions[transitionIndex] + encouragements[encourageIndex].toLowerCase();
        }

        function generateFlowerCode() {
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          let code = '';
          for (let i = 0; i < 8; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters.charAt(randomIndex);
          }
          return code;
        }

        function updateFlowerDisplay() {
          const flowerCodeElement = document.getElementById('flowerCodeDisplay');
          const motivationElement = document.getElementById('monthlyMotivation');
          
          const monthNames = i18next.t('months', { returnObjects: true });
          
          if (userFlowerCode && userBirthdayMonth && userBirthdayDay) {
            const monthName = monthNames[userBirthdayMonth - 1];
            flowerCodeElement.textContent = i18next.t('flower.myFlowerWithDate', { month: monthName, day: userBirthdayDay });
            
            if (!currentMotivation) {
              currentMotivation = generatePersonalizedMotivation(userFlowerCode);
            }
            
            motivationElement.textContent = currentMotivation;
            document.getElementById('captureFlowerCode').textContent = i18next.t('flower.myFlowerWithDate', { month: monthName, day: userBirthdayDay });
            document.getElementById('captureFlowerMotivation').textContent = currentMotivation;
          } else {
            flowerCodeElement.textContent = i18next.t('flower.myFlower');
            motivationElement.textContent = i18next.t('flower.defaultMotivation');
            
            document.getElementById('captureFlowerCode').textContent = i18next.t('flower.myFlower');
            document.getElementById('captureFlowerMotivation').textContent = i18next.t('flower.defaultMotivation');
          }
        }

        function generateAccessCode() {
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let code = '';
          for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters.charAt(randomIndex);
          }
          return code;
        }

        function setCookie(name, value, days) {
          let expires = "";
          if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
          }
          document.cookie = name + "=" + (value || "") + expires + "; path=/";
        }

        function getCookie(name) {
          const nameEQ = name + "=";
          const ca = document.cookie.split(';');
          for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
          }
          return null;
        }

        function eraseCookie(name) {
          document.cookie = name + '=; Max-Age=-99999999; path=/';
        }

        function checkCookieConsent() {
          const cookiesAccepted = getCookie('cookiesAccepted');
          if (!cookiesAccepted) {
            setCookie('cookiesAccepted', 'true', 365);
          }
        }

        signInAnonymously(auth)
          .then((userCredential) => {
            const user = userCredential.user;
            userUid = user.uid;
            console.log("User connected: ", userUid);
          })
          .catch((error) => {
            console.error("Error during anonymous connection: ", error);
            
            userUid = "local_" + Date.now().toString(36) + Math.random().toString(36).substring(2);
          });

        const today = new Date();
        const todayString = today.toISOString().split("T")[0];
        document.getElementById("birthdate").setAttribute('max', todayString);

        function isFutureDate(dateString) {
          const selectedDate = new Date(dateString);
          selectedDate.setHours(0, 0, 0, 0);
          
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          
          return selectedDate > currentDate;
        }

        document.getElementById("birthdate").addEventListener('change', function(e) {
          if (isFutureDate(this.value)) {
            alert(i18next.t('errors.futureDateSelected'));
            this.value = "";
          }
        });

        document.querySelector('.submit-button').addEventListener('click', function(e) {
          const birthdate = document.getElementById('birthdate').value;
          if (isFutureDate(birthdate)) {
            e.preventDefault();
            alert(i18next.t('errors.futureDateSelected'));
            document.getElementById('birthdate').value = "";
            return false;
          }
        });

        fetch('https://restcountries.com/v3.1/all')
          .then(response => {
            if (!response.ok) {
              throw new Error('Network error: ' + response.status);
            }
            return response.json();
          })
          .then(data => {
            data.sort((a, b) => {
              const nameA = a.translations[currentLanguage]?.common || a.name.common;
              const nameB = b.translations[currentLanguage]?.common || b.name.common;
              return nameA.localeCompare(nameB);
            });
            
            const countrySelect = document.getElementById('countrySelect');
            countrySelect.innerHTML = `<option value="" disabled selected>${i18next.t('countrySelect.placeholder')}</option>`;
            
            data.forEach(country => {
              const option = document.createElement('option');
              // Always store the English name as value for consistency
              option.value = country.name.common;
              // Display the translated name if available
              option.textContent = country.translations[currentLanguage]?.common || country.name.common;
              countrySelect.appendChild(option);
            });
            
            loadUserDataFromCookie();
          })
          .catch(error => {
            console.error('Error loading countries from API:', error);
            
            const fallbackCountries = [
                "Afghanistan","Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", 
              "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", 
              "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", 
              "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", 
              "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", 
              "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", 
              "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", 
              "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", 
              "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", 
              "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", 
              "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", 
              "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", 
              "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
              "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", 
              "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", 
              "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", 
              "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", 
              "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", 
              "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", 
              "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", 
              "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", 
              "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", 
              "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", 
              "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", 
              "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", 
              "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", 
              "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", 
              "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe", 
            ].sort();
            
            const countrySelect = document.getElementById('countrySelect');
            countrySelect.innerHTML = `<option value="" disabled selected>${i18next.t('countrySelect.placeholder')}</option>`;
            
            fallbackCountries.forEach(country => {
              const option = document.createElement('option');
              option.value = country;
              option.textContent = i18next.t(`countries.${country}`, { defaultValue: country });
              countrySelect.appendChild(option);
            });
            
            loadUserDataFromCookie();
          });

        function saveUserDataToCookie() {
          if (userBirthdate && userCountry && userGender) {
            const userData = {
              birthdate: userBirthdate,
              country: userCountry,
              gender: userGender,
              wantsMonetization: userWantsMonetization,
              birthdayDay: userBirthdayDay,
              birthdayMonth: userBirthdayMonth,
              birthYear: userBirthYear,
              dataSubmitted: true,
              lastSubmittedId: lastSubmittedId,
              accessCode: userAccessCode,
              flowerCode: userFlowerCode,
              motivation: currentMotivation,
              birthdayStats: userBirthdayStats,
              countryStats: userCountryStats,
              language: currentLanguage
            };
            setCookie('userData', JSON.stringify(userData), 365);
          }
        }

        function updateHeaderAccessCode() {
          if (userAccessCode) {
            document.getElementById('accessCodeIndicator').style.display = 'none';
            document.getElementById('headerAccessCode').style.display = 'block';
            document.getElementById('headerAccessCode').textContent = userAccessCode;
          } else {
            document.getElementById('accessCodeIndicator').style.display = 'block';
            document.getElementById('headerAccessCode').style.display = 'none';
          }
        }

        function loadUserDataFromCookie() {
          const userDataCookie = getCookie('userData');
          if (userDataCookie) {
            try {
              const userData = JSON.parse(userDataCookie);
              userBirthdate = userData.birthdate;
              userCountry = userData.country;
              userGender = userData.gender;
              userWantsMonetization = userData.wantsMonetization;
              userBirthdayDay = userData.birthdayDay;
              userBirthdayMonth = userData.birthdayMonth;
              userBirthYear = userData.birthYear;
              dataSubmitted = userData.dataSubmitted;
              lastSubmittedId = userData.lastSubmittedId;
              userAccessCode = userData.accessCode;
              userFlowerCode = userData.flowerCode;
              currentMotivation = userData.motivation;
              
              if (userData.birthdayStats) {
                userBirthdayStats = userData.birthdayStats;
              }
              
              if (userData.countryStats) {
                userCountryStats = userData.countryStats;
              }
              
              // Update language if stored
              if (userData.language && userData.language !== currentLanguage) {
                i18next.changeLanguage(userData.language, () => {
                  $(document).localize();
                });
                currentLanguage = userData.language;
              }
              
              if (dataSubmitted) {
                document.getElementById('birthdate').value = userBirthdate;
                document.getElementById('countrySelect').value = userCountry;
                
                const submitButton = document.querySelector('.submit-button');
                submitButton.textContent = i18next.t('submittedStatus');
                submitButton.style.backgroundColor = 'green';
                submitButton.disabled = true;
                
                document.getElementById('resetButton').style.display = "block";
                
                document.getElementById('birthdate').classList.add('disabled-field');
                document.getElementById('countrySelect').classList.add('disabled-field');
                
                updateHeaderAccessCode();
              }
            } catch (error) {
              console.error("Error parsing user data from cookie:", error);
            }
          }
        }

        document.querySelector('.submit-button').addEventListener('click', function() {
          const birthdate = document.getElementById('birthdate').value;
          const country = document.getElementById('countrySelect').value;

          if (birthdate && country) {
            if (isFutureDate(birthdate)) {
              alert(i18next.t('errors.futureDateSelected'));
              document.getElementById('birthdate').value = "";
              return;
            }
            
            userBirthdate = birthdate;
            userCountry = country;
            
            const birthdateParts = birthdate.split('-');
            userBirthYear = parseInt(birthdateParts[0]);
            userBirthdayMonth = parseInt(birthdateParts[1]);
            userBirthdayDay = parseInt(birthdateParts[2]);
            
            const submitButton = document.querySelector('.submit-button');
            submitButton.textContent = i18next.t('pleaseWait');
            submitButton.style.backgroundColor = 'orange';

            document.getElementById('birthdate').classList.add('disabled-field');
            document.getElementById('countrySelect').classList.add('disabled-field');

            document.getElementById('genderModal').style.display = 'block';
          } else {
            alert(i18next.t('errors.missingFields'));
          }
        });

        document.querySelectorAll('.gender-option').forEach(button => {
          button.addEventListener('click', function() {
            // Store the original English value from the value attribute
            tempSelectedGender = this.value;
            document.getElementById('genderModal').style.display = 'none';
            proceedWithSubmission(tempSelectedGender);
          });
        });

        function proceedWithSubmission(gender) {
          userGender = gender;
          
          userAccessCode = generateAccessCode();
          userFlowerCode = generateFlowerCode();
          currentMotivation = generatePersonalizedMotivation(userFlowerCode);
          
          submitData(gender);
        }

        async function fetchBirthdayStatistics() {
          try {
            const monthStr = userBirthdayMonth.toString().padStart(2, '0');
            const dayStr = userBirthdayDay.toString().padStart(2, '0');
            const birthdayPattern = `-${monthStr}-${dayStr}`;
            
            const birthdatesRef = ref(database, 'birthdates');
            const birthdatesSnapshot = await get(birthdatesRef);
            
            let sameBirthdayCount = 0;
            let userRank = 0;
            let earlierSubmissions = 0;
            let isCurrentUserCounted = false;
            
            if (birthdatesSnapshot.exists()) {
              const data = birthdatesSnapshot.val();
              
              const entries = Object.entries(data)
                .map(([key, value]) => ({ key, ...value }))
                .filter(entry => entry.date && entry.date.includes(birthdayPattern))
                .sort((a, b) => a.timestamp - b.timestamp);
              
              sameBirthdayCount = entries.length;
              
              for (let i = 0; i < entries.length; i++) {
                if (entries[i].key === lastSubmittedId || (entries[i].uid === userUid && !isCurrentUserCounted)) {
                  userRank = i + 1;
                  isCurrentUserCounted = true;
                }
              }
            }
            
            if (userRank === 0) {
              userRank = sameBirthdayCount;
            }
            
            const monthNames = i18next.t('months', { returnObjects: true });
            const formattedDate = `${monthNames[userBirthdayMonth-1]} ${userBirthdayDay}`;
            
            return {
              totalMembers: sameBirthdayCount,
              userRank: userRank,
              formattedDate: formattedDate
            };
          } catch (error) {
            console.error("Error fetching birthday statistics:", error);
            const monthNames = i18next.t('months', { returnObjects: true });
            return {
              totalMembers: Math.floor(Math.random() * 50) + 5,
              userRank: Math.floor(Math.random() * 10) + 1,
              formattedDate: `${monthNames[userBirthdayMonth-1]} ${userBirthdayDay}`
            };
          }
        }

        async function fetchCountryStatistics() {
          try {
            const birthdatesRef = ref(database, 'birthdates');
            const birthdatesSnapshot = await get(birthdatesRef);
            
            let sameCountryCount = 0;
            
            if (birthdatesSnapshot.exists()) {
              const data = birthdatesSnapshot.val();
              
              sameCountryCount = Object.values(data).filter(entry => 
                entry.country && entry.country === userCountry
              ).length;
            }
            
            return {
              totalMembers: sameCountryCount
            };
          } catch (error) {
            console.error("Error fetching country statistics:", error);
            return {
              totalMembers: Math.floor(Math.random() * 30) + 3
            };
          }
        }

        async function submitData(gender) {
          const birthdate = userBirthdate;
          const country = userCountry;
          const submitButton = document.querySelector('.submit-button');

          const localSuccess = submitToLocalStorage(gender);
          
          try {
            userBirthdayStats = await fetchBirthdayStatistics();
            userCountryStats = await fetchCountryStatistics();
          } catch (error) {
            console.error("Error fetching statistics:", error);
            const monthNames = i18next.t('months', { returnObjects: true });
            userBirthdayStats = {
              totalMembers: Math.floor(Math.random() * 50) + 5,
              userRank: Math.floor(Math.random() * 10) + 1,
              formattedDate: `${monthNames[userBirthdayMonth-1]} ${userBirthdayDay}`
            };
            userCountryStats = {
              totalMembers: Math.floor(Math.random() * 30) + 3
            };
          }
          
          if (localSuccess) {
            try {
              push(ref(database, 'birthdates'), {
                date: birthdate,
                country: country,
                gender: gender,
                monetize: userWantsMonetization,
                birthdayDay: userBirthdayDay,
                birthdayMonth: userBirthdayMonth,
                birthYear: userBirthYear,
                uid: userUid,
                accessCode: userAccessCode,
                flowerCode: userFlowerCode,
                motivation: currentMotivation,
                timestamp: Date.now(),
                language: currentLanguage
              }).then((newEntryRef) => {
                lastSubmittedId = newEntryRef.key;
                console.log("Data successfully submitted to Firebase:", lastSubmittedId);
              }).catch((error) => {
                console.warn("Firebase submission error:", error);
              });
            } catch (error) {
              console.warn("Firebase submission exception:", error);
            }
            
            finishSubmission(true);
          } else {
            finishSubmission(false);
          }
        }

        function submitToLocalStorage(gender) {
          try {
            const randomId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            
            const data = {
              date: userBirthdate,
              country: userCountry,
              gender: gender,
              monetize: userWantsMonetization,
              birthdayDay: userBirthdayDay,
              birthdayMonth: userBirthdayMonth,
              birthYear: userBirthYear,
              uid: userUid || randomId,
              accessCode: userAccessCode,
              flowerCode: userFlowerCode,
              motivation: currentMotivation,
              timestamp: Date.now(),
              language: currentLanguage
            };
            
            const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
            submissions.push(data);
            localStorage.setItem('submissions', JSON.stringify(submissions));
            
            lastSubmittedId = lastSubmittedId || "local_" + randomId;
            
            return true;
          } catch (error) {
            console.error("localStorage submission error:", error);
            return false;
          }
        }

        function finishSubmission(success) {
          const submitButton = document.querySelector('.submit-button');
          
          if (success) {
            updateHeaderAccessCode();
            
            submitButton.style.backgroundColor = 'green';
            submitButton.textContent = i18next.t('submittedStatus');
            submitButton.disabled = true;
            document.getElementById('resetButton').style.display = "block";
            dataSubmitted = true;
            
            saveUserDataToCookie();
          } else {
            submitButton.style.backgroundColor = 'red';
            submitButton.textContent = i18next.t('error');
            console.error("Error during submission");
            
            document.getElementById('birthdate').classList.remove('disabled-field');
            document.getElementById('countrySelect').classList.remove('disabled-field');
          }
        }

        function getOrdinal(n) {
          const s = ["th", "st", "nd", "rd"];
          const v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        }

        document.getElementById('resetButton').addEventListener('click', function() {
          if (confirm(i18next.t('resetConfirmation'))) {
            resetLocalStorageData();
            
            deleteFromFirebase().then(() => {
              finishReset();
            }).catch(error => {
              console.error("Error during reset process:", error);
              alert(i18next.t('errors.resetError'));
            });
          }
        });
        
        async function deleteFromFirebase() {
          if (!lastSubmittedId) {
            try {
              if (userUid) {
                const birthdatesRef = ref(database, 'birthdates');
                const birthdatesSnapshot = await get(birthdatesRef);
                
                if (birthdatesSnapshot.exists()) {
                  const data = birthdatesSnapshot.val();
                  
                  for (const [key, value] of Object.entries(data)) {
                    if (value.uid === userUid) {
                      console.log(`Found entry with matching UID: ${key}`);
                      
                      await remove(ref(database, `birthdates/${key}`));
                      console.log(`Deleted entry: ${key}`);
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Error searching for user data in Firebase:", error);
              throw error;
            }
          } else if (!lastSubmittedId.startsWith('local_')) {
            try {
              await remove(ref(database, `birthdates/${lastSubmittedId}`));
              console.log("Firebase data successfully deleted:", lastSubmittedId);
            } catch (error) {
              console.error("Error deleting from Firebase:", error);
              throw error;
            }
          }
          
          return true;
        }
        
        function resetLocalStorageData() {
          try {
            const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
            const filteredSubmissions = submissions.filter(sub => 
              !sub.uid || sub.uid !== userUid
            );
            localStorage.setItem('submissions', JSON.stringify(filteredSubmissions));
            return true;
          } catch (error) {
            console.error("Error resetting localStorage data:", error);
            return false;
          }
        }
        
        function finishReset() {
          document.getElementById('birthdate').value = '';
          document.getElementById('countrySelect').value = '';
          const submitButton = document.querySelector('.submit-button');
          submitButton.textContent = i18next.t('submitButton');
          submitButton.style.backgroundColor = '#007bff';
          submitButton.disabled = false;
          document.getElementById('resetButton').style.display = "none";
          
          document.getElementById('accessCodeIndicator').style.display = 'block';
          document.getElementById('headerAccessCode').style.display = 'none';
          
          dataSubmitted = false;
          userBirthdate = null;
          userCountry = null;
          userGender = null;
          userWantsMonetization = null;
          userBirthdayDay = null;
          userBirthdayMonth = null;
          userBirthYear = null;
          lastSubmittedId = null;
          userAccessCode = null;
          userFlowerCode = null;
          currentMotivation = null;
          userBirthdayStats = {
            totalMembers: 0,
            userRank: 0,
            formattedDate: ""
          };
          userCountryStats = {
            totalMembers: 0
          };
          
          document.getElementById('birthdate').classList.remove('disabled-field');
          document.getElementById('countrySelect').classList.remove('disabled-field');
          
          eraseCookie('userData');
          
          alert(i18next.t('resetSuccess'));
        }

        document.getElementById('flowerButton').addEventListener('click', function() {
          updateFlowerDisplay();
          document.getElementById('flowerModal').style.display = 'block';
          document.getElementById('shareFlowerButton').style.display = 'flex';
        });

        // Community button handler - opens the community modal
        document.getElementById('communityButton').addEventListener('click', function() {
          document.getElementById('communityModal').style.display = 'block';
        });

        // Close community modal
        document.getElementById('closeCommunityModal').addEventListener('click', function() {
          document.getElementById('communityModal').style.display = 'none';
        });

        document.getElementById('shareFlowerButton').addEventListener('click', function() {
          if (userFlowerCode) {
            captureFlower();
          } else {
            alert(i18next.t('errors.flowerCodeMissing'));
          }
        });
        
        async function captureFlower() {
          try {
            const captureContainer = document.getElementById('flowerCaptureContainer');
            
            if (typeof html2canvas === 'undefined') {
              await loadHTML2Canvas();
            }
            
            const canvas = await html2canvas(captureContainer, {
              backgroundColor: 'white',
              scale: 7,
              logging: false,
              useCORS: true,
              allowTaint: false,
              letterRendering: true,
              imageTimeout: 0
            });
            
            const imageUrl = canvas.toDataURL('image/png', 1.0);
            
            document.getElementById('capturedImage').src = imageUrl;
            document.getElementById('capturedFlower').style.display = 'flex';
            
            document.getElementById('shareWarning').style.display = 'block';
          } catch (error) {
            console.error('Error capturing flower:', error);
            alert(i18next.t('errors.captureError'));
          }
        }
        
        function loadHTML2Canvas() {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        
        document.getElementById('shareCapture').addEventListener('click', function() {
          const imageUrl = document.getElementById('capturedImage').src;
          
          if (navigator.share) {
            fetch(imageUrl)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], 'my-gz-flower.png', { type: 'image/png' });
                navigator.share({
                  title: i18next.t('flower.shareTitle'),
                  text: i18next.t('flower.shareText'),
                  files: [file]
                }).catch(err => {
                  console.log('Error sharing:', err);
                  fallbackShare();
                });
              })
              .catch(err => {
                console.log('Error preparing image:', err);
                fallbackShare();
              });
          } else {
            fallbackShare();
          }
        });
        
        function fallbackShare() {
          try {
            const monthNames = i18next.t('months', { returnObjects: true });
            const monthName = userBirthdayMonth ? monthNames[userBirthdayMonth - 1] : "";
            const dayNumber = userBirthdayDay || "";
            
            const shareText = i18next.t('flower.fallbackShareText', { month: monthName, day: dayNumber });
            
            navigator.clipboard.writeText(shareText).then(function() {
              alert(i18next.t('flower.clipboardSuccess'));
            }).catch(function() {
              alert(i18next.t('flower.clipboardError'));
            });
          } catch (error) {
            console.error('Fallback share error:', error);
            alert(i18next.t('flower.shareManual'));
          }
        }
        
        document.getElementById('closeCapture').addEventListener('click', function() {
          document.getElementById('capturedFlower').style.display = 'none';
        });

        document.getElementById('accessCodeContainer').addEventListener('click', function() {
          if (userAccessCode) {
            navigator.clipboard.writeText(userAccessCode).then(function() {
              const container = document.getElementById('accessCodeContainer');
              container.style.backgroundColor = '#e0f0ff';
              setTimeout(() => {
                container.style.backgroundColor = '#f0f7ff';
              }, 300);
            }).catch(function(err) {
              console.error('Could not copy access code: ', err);
            });
          }
        });
        
        document.getElementById('closeGenderModal').addEventListener('click', function() {
          document.getElementById('genderModal').style.display = 'none';
          
          const submitButton = document.querySelector('.submit-button');
          submitButton.style.backgroundColor = '#007bff';
          submitButton.textContent = i18next.t('submitButton');
          
          document.getElementById('birthdate').classList.remove('disabled-field');
          document.getElementById('countrySelect').classList.remove('disabled-field');
        });
        
        document.getElementById('closeFlowerModal').addEventListener('click', function() {
          document.getElementById('flowerModal').style.display = 'none';
          document.getElementById('shareFlowerButton').style.display = 'none';
        });

        window.onclick = function(event) {
          const genderModal = document.getElementById('genderModal');
          const flowerModal = document.getElementById('flowerModal');
          const capturedFlower = document.getElementById('capturedFlower');
          const communityModal = document.getElementById('communityModal');
          
          if (event.target == genderModal) {
            genderModal.style.display = "none";
            const submitButton = document.querySelector('.submit-button');
            submitButton.style.backgroundColor = 'red';
            submitButton.textContent = i18next.t('error');
            
            document.getElementById('birthdate').classList.remove('disabled-field');
            document.getElementById('countrySelect').classList.remove('disabled-field');
          }
          
          if (event.target == flowerModal) {
            flowerModal.style.display = "none";
            document.getElementById('shareFlowerButton').style.display = 'none';
          }
          
          if (event.target == capturedFlower) {
            capturedFlower.style.display = "none";
          }
          
          if (event.target == communityModal) {
            communityModal.style.display = "none";
          }
        };

        checkCookieConsent();
        
        document.getElementById('shareFlowerButton').style.display = 'none';
        
        document.getElementById('shareWarning').style.display = 'none';
        
        loadHTML2Canvas().catch(err => console.log('Non-critical preload error:', err));
        
        // Handle language changes
        i18next.on('languageChanged', () => {
          currentLanguage = i18next.language;
          
          // Update all UI elements with new translations
          $(document).localize();
          
          // Regenerate motivational message if needed
          if (userFlowerCode) {
            currentMotivation = generatePersonalizedMotivation(userFlowerCode);
            updateFlowerDisplay();
          }
          
          // Update other elements as needed
          if (dataSubmitted) {
            const submitButton = document.querySelector('.submit-button');
            submitButton.textContent = i18next.t('submittedStatus');
          }
          
          // Update saved language preference
          if (dataSubmitted) {
            saveUserDataToCookie();
          }
        });
      });
    });
  });
}
