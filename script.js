'use strict';

// prettier-ignore


let map, mapEvent;


class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
};

// Child class of Workout - Running
class Running extends Workout {
    type = 'running';
    // Constructor child of Workout should take in the same data as the parent class + additional properties we want to set
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        // Use the constructor to immediately calculate the pace
        this.calcPace();
        this._setDescription();
    }

    // Calculate the pace
    calcPace() {
        // min per km
        this.pace = this.duration / this.distance
        return this.pace;
    }
};


// Child class of Workout
class Cycling extends Workout {
    // define a field
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription(); 
    }

    calcSpeed() {
        // km per hour
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
};

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 29, 95, 528);
// console.log(run1, cycling1)


//////////////////////////////
// APPLICATION ARCHITECTURE 

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];        

    // Use getPosition here because constructor executes while the page loads 
    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from local stoarge
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }


    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this), 
                function() {
                alert('Could not get your position')
            }
            )}
    }

    _loadMap(position) {
            // Use destructuring to create a variable called 'latitude' based out of the latitude property of this object
            const {latitude} = position.coords;
            const {longitude} = position.coords;
        
            // Create an array to use in setView and marker
            const coords = [latitude, longitude];
        
            // Create a link with your current location
            console.log(`https://www.google.com/maps/@${latitude},${longitude}`)
        
            // Leaflet API
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);
        
        
            // Add marker on click
            // on() is a special method from the Leaflet
            this.#map.on('click', this._showForm.bind(this));

            this.#workouts.forEach(work => {
                this._renderWorkout(work);
                this._renderWorkoutMarker(work);
            });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        // On click, show form
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // Empty the inputs
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = ''; 

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {

        // Loop over the array, check if the number is finite or not
        // every() will return true if all of them are true
        const validInputs = (...inputs) => 
                inputs.every(inp => Number.isFinite(inp));

        const allPositive = (...inputs) => 
                inputs.every(inp => inp > 0);
        
        e.preventDefault();
        
        // Get data from the form
        const type = inputType.value;
        const distance = +inputDistance.value; // convert to a number
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;
        
        // If activity running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // Check if data is valid
            // Use guard clause - check for the opposite of what we are originally interested in; if that opposite is true - return function
            if (
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) || 
                !allPositive(distance, duration, cadence)
                ) 
                return alert('Inputs have to be positive numbers!');

            workout = new Running([lat, lng], distance, duration, cadence);
            

        };


        // If activity cycling, create cycling object
        if (type === 'cycling') {
            // Check if data is valid
            const elevation = +inputElevation.value;

            if (
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration)
                )
                return alert('Inputs have to be positive numbers!');

            workout = new Cycling([lat, lng], distance, duration, elevation);
        };

        // Add new object to workout array
        this.#workouts.push(workout);

        // Render workout on map as marker
        this._renderWorkoutMarker(workout);       

        // Render workout on list
        this._renderWorkout(workout)

        // Hide form + clear input fields
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({maxWidth: 250, 
                            minWidth: 100,
                            autoClose: false,
                            closeOnClick: false,
                            className: `${workout.type}-popup`,
                        })
                        )
                        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
                        .openPopup()
        .openPopup();
    }

    _renderWorkout(workout) {

        let html = 
        `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
            `;

        if (workout.type === 'running') {
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>
          `;
        }

        if (workout.type === 'cycling') {
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>
        `;
        }
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true, 
            pan: {
                duration: 1
            }
        })

        // Using the public interface
        // workout.click();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        // console.log(data);

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
};

const app = new App();





// // // 233. Displaying a Map Using Leaflet Library

// // // 234. Display a Map Marker whenever we click on the map

// // // 235. Rendering Workout Input Form

// // // 236. Project Architecture

// // // 237. 

// // // 238.

// // // 239.

// // // 240.

// // // 241.

// // // 242.

