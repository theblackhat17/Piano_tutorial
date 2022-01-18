var scrolldelay;

var search_song;
var get_songs_timeout;

let beats_per_minute = 160;
let beats_per_measure = 4;
let count = 0;
let is_playing = 0;


const tick1 = new Audio('/static/tick2.mp3');
tick1.volume = 0.2;
const tick2 = new Audio('/static/tick1.mp3');
tick2.volume = 0.2;

function play_tick_sound() {
    if (count >= beats_per_measure) {
        count = 0;
    }
    if (count === 0) {
        tick1.play();
        tick1.currentTime = 0;
    } else {
        tick2.play();
        tick2.currentTime = 0;
    }

    count++;
}

function change_bpm(bpm) {
    beats_per_minute = bpm;
    ticker.interval = 60000 / bpm;
}

function change_volume(value) {
    if (parseInt(value) < -10 || parseInt(value) > 110) {
        return false;
    }
    value = (parseFloat(value) / 100);
    tick1.volume = value;
    tick2.volume = value;
}

function change_beats_per_measure(value) {
    if (parseInt(value) <= 2) {
        return false;
    }
    beats_per_measure = parseInt(value);
}

var ticker = new AdjustingInterval(play_tick_sound, 60000 / beats_per_minute);


function loadAjax(subpage) {
    document.getElementById("main").classList.remove("show");
    setTimeout(function () {
        document.getElementById("main").innerHTML = "";
    }, 100);

    if (document.getElementById("midi_player")) {
        document.getElementById('midi_player').stop()
    }

    setTimeout(function () {
        var xhttp = new XMLHttpRequest();
        xhttp.timeout = 5000;
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                document.getElementById("main").innerHTML = this.responseText;
                setTimeout(function () {
                    document.getElementById("main").classList.add("show");
                }, 100);
                remove_page_indicators()
                document.getElementById(subpage).classList.add("dark:bg-gray-700", "bg-gray-100");
                if (subpage == "home") {
                    initialize_homepage();
                    get_homepage_data_loop();
                    get_settings(false);
                }
                if (subpage == "ledsettings") {
                    initialize_led_settings();
                    get_current_sequence_setting();
                    clearInterval(homepage_interval);
                }
                if (subpage == "ledanimations") {
                    clearInterval(homepage_interval);
                }
                if (subpage == "songs") {
                    initialize_songs();
                    clearInterval(homepage_interval);
                }
                if (subpage == "sequences") {
                    initialize_sequences();
                    initialize_led_settings();
                    clearInterval(homepage_interval);
                }
                if (subpage == "ports") {
                    clearInterval(homepage_interval);
                    initialize_ports_settings();
                }
                if (subpage == "settings") {
                    clearInterval(homepage_interval);
                }
            }
        };
        xhttp.ontimeout = function (e) {
            document.getElementById("main").innerHTML = "REQUEST TIMEOUT";
        };
        xhttp.onerror = function (e) {
            document.getElementById("main").innerHTML = "REQUEST FAILED";
        };
        xhttp.open("GET", "/" + subpage, true);
        xhttp.send();
    }, 100);
}

loadAjax("home")

function remove_page_indicators() {
    document.getElementById("home").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("ledsettings").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("songs").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("sequences").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("ports").classList.remove("dark:bg-gray-700", "bg-gray-100");
    document.getElementById("ledanimations").classList.remove("dark:bg-gray-700", "bg-gray-100");
}


function get_homepage_data_loop() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var refresh_rate = getCookie("refresh_rate")
            if (refresh_rate == 0) {
                refresh_rate = 1
            }
            var response_pc_stats = JSON.parse(this.responseText);

            var download = (response_pc_stats.download - download_start) / refresh_rate;
            var upload = (response_pc_stats.upload - upload_start) / refresh_rate;
            if (download_start == 0) {
                download = 0;
                upload = 0;
            }
            animateValue(document.getElementById("cpu_number"), last_cpu_usage,
                response_pc_stats.cpu_usage, refresh_rate * 500, false);
            document.getElementById("memory_usage_percent").innerHTML = response_pc_stats.memory_usage_percent + "%";
            document.getElementById("memory_usage").innerHTML =
                formatBytes(response_pc_stats.memory_usage_used, 2, false) + "/" +
                formatBytes(response_pc_stats.memory_usage_total);
            document.getElementById("cpu_temp").innerHTML = response_pc_stats.cpu_temp + "°C";
            document.getElementById("card_usage").innerHTML =
                formatBytes(response_pc_stats.card_space_used, 2, false) + "/" +
                formatBytes(response_pc_stats.card_space_total);
            document.getElementById("card_usage_percent").innerHTML = response_pc_stats.card_space_percent + "%";
            animateValue(document.getElementById("download_number"), last_download, download, refresh_rate * 500, true);
            animateValue(document.getElementById("upload_number"), last_upload, upload, refresh_rate * 500, true);

            download_start = response_pc_stats.download;
            upload_start = response_pc_stats.upload;

            last_cpu_usage = response_pc_stats.cpu_usage;
            last_download = download;
            last_upload = upload;
        }
    };
    xhttp.open("GET", "/api/get_homepage_data", true);
    xhttp.send();
}


function start_led_animation(name, speed) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/api/start_animation?name=" + name + "&speed=" + speed, true);
    xhttp.send();
}

function change_setting(setting_name, value, second_value = false, disable_sequence = false) {
    var xhttp = new XMLHttpRequest();
    try {
        value = value.replaceAll('#', '');
    } catch {
    }
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            response = JSON.parse(this.responseText);
            if (response.reload == true) {
                get_settings();
                get_current_sequence_setting();
            }
            if (response.reload_ports == true) {
                get_ports();
            }
            if (response.reload_songs == true) {
                get_recording_status();
                get_songs();
            }
            if (response.reload_sequence == true) {
                get_current_sequence_setting();
                get_sequences();
            }
            if (response.reload_steps_list == true) {
                get_steps_list();
            }
        }
    }
    xhttp.open("GET", "/api/change_setting?setting_name=" + setting_name + "&value=" + value
        + "&second_value=" + second_value + "&disable_sequence=" + disable_sequence, true);
    xhttp.send();
}

function switch_ports() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            get_ports()
            if (document.getElementById('switch_ports') != null) {
                document.getElementById('switch_ports').disabled = false;
            }
            document.getElementById('switch_ports_sidebar').disabled = false;
        }
    };
    xhttp.open("GET", "/api/switch_ports", true);
    xhttp.send();
}

function get_settings(home = true) {
    var xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            response = JSON.parse(this.responseText);
            if (home) {

                if (document.getElementById("backlight_color")) {
                    document.getElementById("backlight_color").value = response.backlight_color;
                    document.getElementById("sides_color").value = response.sides_color;
                    document.getElementById("sides_color_mode").value = response.sides_color_mode;

                    if (response.sides_color_mode !== "RGB") {
                        document.getElementById('sides_color_choose').hidden = true;
                    }

                    document.getElementById("brightness").value = response.brightness;
                    document.getElementById("brightness_percent").value = response.brightness + "%";
                    document.getElementById("backlight_brightness").value = response.backlight_brightness;
                    document.getElementById("backlight_brightness_percent").value = response.backlight_brightness + "%";
                    document.getElementById("skipped_notes").value = response.skipped_notes;
                    document.getElementById("led_count").value = response.led_count;
                    document.getElementById("shift").value = response.led_shift;
                    document.getElementById("reverse").value = response.led_reverse;
                    document.getElementById("sides_color").dispatchEvent(new Event('input'));
                    document.getElementById("backlight_color").dispatchEvent(new Event('input'));
                }

                document.getElementById("light_mode").value = response.light_mode;
                if (response.light_mode == "Fading") {
                    document.getElementById('fading').hidden = false;
                    document.getElementById('fading_speed').value = response.fading_speed;
                }
                if (response.light_mode == "Velocity") {
                    document.getElementById('velocity').hidden = false;
                    document.getElementById('fading_speed').value = response.fading_speed;
                }

                document.getElementById("led_color").value = response.led_color;

                document.getElementById("color_mode").value = response.color_mode;

                show_multicolors(response.multicolor, response.multicolor_range);

                document.getElementById("rainbow_offset").value = response.rainbow_offset;
                document.getElementById("rainbow_scale").value = response.rainbow_scale;
                document.getElementById("rainbow_timeshift").value = response.rainbow_timeshift;

                document.getElementById("speed_slow_color").value = response.speed_slowest_color;
                document.getElementById("speed_fast_color").value = response.speed_fastest_color;

                document.getElementById("speed_max_notes").value = response.speed_max_notes;
                document.getElementById("speed_period_in_seconds").value = response.speed_period_in_seconds;

                document.getElementById("gradient_start_color").value = response.gradient_start_color;
                document.getElementById("gradient_end_color").value = response.gradient_end_color;

                document.getElementById("key_in_scale_color").value = response.key_in_scale_color;
                document.getElementById("key_not_in_scale_color").value = response.key_not_in_scale_color;

                document.getElementById("scale_key").value = response.scale_key;

                document.getElementById('color_mode').onchange();
            } else {
                document.getElementById("color_mode").innerHTML = response.color_mode;
                document.getElementById("light_mode").innerHTML = response.light_mode;
                document.getElementById("brightness_percent").innerHTML = response.brightness + "%";
                document.getElementById("backlight_brightness_percent").innerHTML = response.backlight_brightness + "%";
                document.getElementById("input_port").innerHTML = response.input_port;
                document.getElementById("playback_port").innerHTML = response.play_port;
            }

        }
    };
    xhttp.open("GET", "/api/get_settings", true);
    xhttp.send();
}

function get_current_sequence_setting(home = true, is_loading_step = false) {
    var xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            response = JSON.parse(this.responseText);

            if (document.getElementById('sequence_edit')) {
                is_editing_sequence = document.getElementById('sequence_edit').getAttribute("active");
            } else {
                is_editing_sequence = "false";
            }

            if (document.getElementById("current_color_mode")) {
                document.getElementById("current_color_mode").innerHTML = response.color_mode
                document.getElementById("current_light_mode").innerHTML = response.light_mode
            }

            if (is_editing_sequence == "true") {
                document.getElementById('fading').hidden = true;
                document.getElementById('velocity').hidden = true;
                document.getElementById("light_mode").value = response.light_mode;
                if (response.light_mode == "Fading") {
                    document.getElementById('fading').hidden = false;
                    document.getElementById('fading_speed').value = response.fading_speed;
                }
                if (response.light_mode == "Velocity") {
                    document.getElementById('velocity').hidden = false;
                    document.getElementById('fading_speed').value = response.fading_speed;
                }
                document.getElementById("color_mode").value = response.color_mode;
                change_setting("color_mode", response.color_mode, "no_reload", true);
                change_setting("light_mode", response.light_mode, false, true);
            }

            if (response.color_mode == "Single") {
                document.getElementById("current_led_color").innerHTML = '<svg width="100%" height="45px">' +
                    '<defs>\n' +
                    '   <linearGradient id="gradient_single" x1=".5" y1="1" x2=".5">\n' +
                    '       <stop stop-color="' + response.led_color + '" stop-opacity="0"/>\n' +
                    '       <stop offset=".61" stop-color="' + response.led_color + '" stop-opacity=".65"/>\n' +
                    '       <stop offset="1" stop-color="' + response.led_color + '"/>\n' +
                    '   </linearGradient>\n' +
                    '</defs>' +
                    '<rect width="100%" height="45px" fill="url(#gradient_single)" /></svg>'
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">';

                if (is_editing_sequence == "true") {
                    remove_color_modes();
                    document.getElementById("led_color").value = response.led_color;
                    document.getElementById('Single').hidden = false;
                    document.getElementById("led_color").dispatchEvent(new Event('input'));

                    change_setting("led_color", response.led_color, "no_reload", true);
                }

            }
            if (response.color_mode == "Multicolor") {

                document.getElementById("current_led_color").innerHTML = '';
                var new_multicolor = {};
                response.multicolor.forEach(function (item, index) {
                    var multicolor_hex = rgbToHex(item[0], item[1], item[2]);

                    var length = (response.multicolor_range[index][1] - 20) - (response.multicolor_range[index][0] - 20)
                    length = (length / 88) * 100
                    var left_spacing = ((response.multicolor_range[index][0] - 20) / 88) * 100

                    left_spacing = Math.min(Math.max(parseInt(left_spacing), 0), 88);

                    document.getElementById("current_led_color").innerHTML += '<svg class="mb-2" ' +
                        'style="filter: drop-shadow(0px 5px 15px ' + multicolor_hex + ');margin-left:' + left_spacing + '%" width="100%" height="10px">' +
                        '<rect width="' + length + '%" height="20" fill="' + multicolor_hex + '" /></svg>';

                    if (is_editing_sequence == "true" && is_loading_step == true) {
                        new_multicolor[index] = {};
                        new_multicolor[index]["color"] = multicolor_hex;
                        new_multicolor[index]["range"] = response.multicolor_range[index];
                    }

                });
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-100" ' +
                    'style="height: 40px;width:100%;" src="../static/piano.svg">';

                if (is_editing_sequence == "true" && is_loading_step == true) {
                    remove_color_modes();
                    document.getElementById('Multicolor').hidden = false;
                    show_multicolors(response.multicolor, response.multicolor_range);
                    change_setting("add_multicolor_and_set_value", JSON.stringify(new_multicolor), "", "");
                }


            }
            if (response.color_mode == "Gradient") {
                document.getElementById("current_led_color").innerHTML = '<svg ' +
                    'width="100%" height="45px">\n' +
                    '      <defs>\n' +
                    '        <linearGradient id="g1">\n' +
                    '          <stop offset="5%" stop-color="' + response.gradient_end_color + '" />\n' +
                    '          <stop offset="95%" stop-color="' + response.gradient_start_color + '" />\n' +
                    '        </linearGradient>\n' +
                    '       <linearGradient id="g2" x1=".5" x2=".5" y2="1">\n' +
                    '           <stop stop-color="#000" stop-opacity="0"/>\n' +
                    '           <stop offset=".59" stop-color="#000" stop-opacity=".34217436974789917"/>\n' +
                    '           <stop offset="1" stop-color="#000"/>\n' +
                    '       </linearGradient>' +
                    '      </defs>\n' +
                    '      <rect width="100%" height="45px" fill=\'url(#g1)\'/>' +
                    '      <rect width="100%" height="45px" fill=\'url(#g2)\'/>\n' +
                    '    </svg>'
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">';

                if (is_editing_sequence == "true") {
                    remove_color_modes();
                    document.getElementById('Gradient').hidden = false;
                    document.getElementById("gradient_start_color").value = response.gradient_start_color;
                    document.getElementById("gradient_end_color").value = response.gradient_end_color;

                    document.getElementById("gradient_start_color").dispatchEvent(new Event('input'));
                    document.getElementById("gradient_end_color").dispatchEvent(new Event('input'));

                    change_setting("gradient_start_color", response.gradient_start_color, "no_reload", true);
                    change_setting("gradient_end_color", response.gradient_end_color, "no_reload", true);
                }
            }

            if (response.color_mode == "Speed") {
                document.getElementById("current_led_color").innerHTML = '<svg ' +
                    'width="100%" height="45px">\n' +
                    '      <defs>\n' +
                    '        <linearGradient id="g1">\n' +
                    '          <stop offset="5%" stop-color="' + response.speed_slowest_color + '" />\n' +
                    '          <stop offset="95%" stop-color="' + response.speed_fastest_color + '" />\n' +
                    '        </linearGradient>\n' +
                    '       <linearGradient id="g2" x1=".5" x2=".5" y2="1">\n' +
                    '           <stop stop-color="#000" stop-opacity="0"/>\n' +
                    '           <stop offset=".59" stop-color="#000" stop-opacity=".34217436974789917"/>\n' +
                    '           <stop offset="1" stop-color="#000"/>\n' +
                    '       </linearGradient>' +
                    '      </defs>\n' +
                    '      <rect width="100%" height="45px" fill=\'url(#g1)\'/>' +
                    '      <rect width="100%" height="45px" fill=\'url(#g2)\'/>\n' +
                    '    </svg>'
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">' +
                    '<div class="flex"><p class="w-full text-xs italic text-gray-600 dark:text-gray-400">slowest</p>' +
                    '<p class="w-full text-xs italic text-right text-gray-600 dark:text-gray-400">fastest</p></div>';

                if (is_editing_sequence == "true") {
                    remove_color_modes();
                    document.getElementById('Speed').hidden = false;
                    document.getElementById("speed_slow_color").value = response.speed_slowest_color;
                    document.getElementById("speed_fast_color").value = response.speed_fastest_color;

                    document.getElementById("speed_slow_color").dispatchEvent(new Event('input'));
                    document.getElementById("speed_fast_color").dispatchEvent(new Event('input'));


                    change_setting("speed_slow_color", response.speed_slowest_color, "no_reload", true);
                    change_setting("speed_fast_color", response.speed_fastest_color, "no_reload", true);
                }
            }

            if (response.color_mode == "Rainbow") {
                offset = response.rainbow_offset % 175;
                offset_percent = (offset / 175) * 100;
                offset_percent = -200 - offset_percent;

                if (response.rainbow_timeshift < 0) {
                    response.rainbow_timeshift *= -1;
                    timeshift_speed_in_seconds = 19 * (10 / response.rainbow_timeshift);
                    animation = 'animation: bannermove_right ' + timeshift_speed_in_seconds + 's linear infinite;';
                } else {
                    timeshift_speed_in_seconds = 19 * (10 / response.rainbow_timeshift);
                    animation = 'animation: bannermove_left ' + timeshift_speed_in_seconds + 's linear infinite;';
                }

                //calculating width of gradient box
                box_amount = Math.floor(response.rainbow_scale / 150);
                box_remaining = response.rainbow_scale % 150;
                box_remaining_percent = (box_remaining / 150) * 100
                if (box_remaining > 0) {
                    if (box_amount > 0) {
                        parts = 100 / box_remaining_percent;
                        total_parts_visible = ((parts * box_amount) + 1);
                        width = (100 / total_parts_visible) * parts;
                    } else {
                        width = (100 / box_remaining_percent) * 100;
                    }
                    box_amount += 1;
                } else {
                    width = 0;
                }

                var rainbow_example = '';
                rainbow_example += '<div class="flex overflow-hidden mt-2">';
                //+4, because there has to be two additional gradient boxes on both sides, so both offset and animation can be applied
                for (i = 0; i < (box_amount + 4); i++) {
                    rainbow_example += '<div class="rainbow-box" style="' + animation + '' +
                        'transform: translateX(' + offset_percent + '%);min-width:' + width + '%;"></div>';
                }
                rainbow_example += '</div>'
                rainbow_example += '<img class="w-full opacity-50" style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">'
                rainbow_example += '<p class="text-xs italic text-right text-gray-600 dark:text-gray-400">*approximate look</p>'
                /*
                rainbow_example += '<label ' +
                    'class="block uppercase tracking-wide text-xs font-bold mt-2 text-gray-600 dark:text-gray-400">Offset</label>' +
                    '<div class="w-full">' + response.rainbow_offset + '</div>'
                rainbow_example += '<label ' +
                    'class="block uppercase tracking-wide text-xs font-bold mt-2 text-gray-600 dark:text-gray-400">Timeshift</label>' +
                    '<div class="w-full">' + response.rainbow_timeshift + '</div>'
                 */
                document.getElementById("current_led_color").innerHTML = rainbow_example;

                if (is_editing_sequence == "true") {
                    document.getElementById("rainbow_offset").value = response.rainbow_offset;
                    document.getElementById("rainbow_scale").value = response.rainbow_scale;
                    document.getElementById("rainbow_timeshift").value = response.rainbow_timeshift;

                    remove_color_modes();
                    document.getElementById('Rainbow').hidden = false;

                    change_setting("rainbow_offset", response.rainbow_offset, "no_reload", true);
                    change_setting("rainbow_scale", response.rainbow_scale, "no_reload", true);
                    change_setting("rainbow_timeshift", response.rainbow_timeshift, "no_reload", true);
                }
            }

            if (response.color_mode == "Scale") {
                //document.getElementById("led_color").innerHTML = response.scale_key
                let scale_key_array = [response.key_in_scale_color, response.key_not_in_scale_color];
                document.getElementById("current_led_color").innerHTML = '<div id="led_color_scale" class="flex"></div>';

                scale_key_array.forEach(function (item, index) {
                    document.getElementById("led_color_scale").innerHTML += '<svg width="100%" height="45px">' +
                        '<defs>\n' +
                        '   <linearGradient id="gradient_single_' + item + '" x1=".5" y1="1" x2=".5">\n' +
                        '       <stop stop-color="' + item + '" stop-opacity="0"/>\n' +
                        '       <stop offset=".61" stop-color="' + item + '" stop-opacity=".65"/>\n' +
                        '       <stop offset="1" stop-color="' + item + '"/>\n' +
                        '   </linearGradient>\n' +
                        '</defs>' +
                        '<rect width="100%" height="45px" fill="url(#gradient_single_' + item + ')" /></svg>';
                });
                document.getElementById("current_led_color").innerHTML += '<img class="w-full opacity-50" ' +
                    'style="height: 40px;width:100%;margin-top:-40px" src="../static/piano.svg">' +
                    '<div class="flex"><p class="w-full text-xs italic text-gray-600 dark:text-gray-400">in a scale</p>' +
                    '<p class="w-full text-xs italic text-right text-gray-600 dark:text-gray-400">not in a scale</p></div>';
                if (is_editing_sequence == "true") {
                    remove_color_modes();
                    document.getElementById('Scale').hidden = false;
                    document.getElementById("key_in_scale_color").value = response.key_in_scale_color;
                    document.getElementById("key_not_in_scale_color").value = response.key_not_in_scale_color;
                    document.getElementById("scale_key").value = response.scale_key;

                    document.getElementById("key_in_scale_color").dispatchEvent(new Event('input'));
                    document.getElementById("key_not_in_scale_color").dispatchEvent(new Event('input'));

                    change_setting("key_in_scale_color", response.key_in_scale_color, "no_reload", true);
                    change_setting("key_not_in_scale_color", response.key_not_in_scale_color, "no_reload", true);
                    change_setting("scale_key", response.scale_key, "no_reload", true);
                }
            }
        }
    };
    xhttp.open("GET", "/api/get_sequence_setting", true);
    xhttp.send();
}


function initialize_homepage() {
    clearInterval(homepage_interval);
    if (getCookie("refresh_rate") != null) {
        refresh_rate = getCookie("refresh_rate");
    } else {
        setCookie("refresh_rate", 3, 365);
    }
    document.getElementById("refresh_rate").value = refresh_rate;
    if (getCookie("refresh_rate") != 0 && refresh_rate != null) {
        homepage_interval = setInterval(get_homepage_data_loop, refresh_rate * 1000)
    }
    if (getCookie("refresh_rate") == 0) {
        setTimeout(get_homepage_data_loop, 1000)
    }
    document.getElementById('refresh_rate').onchange = function () {
        setCookie('refresh_rate', this.value, 365);
        clearInterval(homepage_interval)
        if (this.value != 0) {
            homepage_interval = setInterval(get_homepage_data_loop, this.value * 1000)
        }
    }

    if (is_playing) {
        document.getElementById("metronome_start").classList.add("hidden");
        document.getElementById("metronome_stop").classList.remove("hidden");
    } else {
        document.getElementById("metronome_start").classList.remove("hidden");
        document.getElementById("metronome_stop").classList.add("hidden");
    }
    document.getElementById("beats_per_minute").innerHTML = beats_per_minute;
    document.getElementById("bpm_slider").value = beats_per_minute;

    document.getElementById("beats_per_measure").value = beats_per_measure;

}

function initialize_led_settings() {
    if (document.getElementById('brightness')) {

        document.getElementById('backlightcolors').addEventListener('change', function (event) {
            change_color_input('backlight_', 'backlight_color', 'backlight_color')
        });

        document.getElementById('sidescolors').addEventListener('change', function (event) {
            change_color_input('sides_', 'sides_color', 'sides_color')
        });

        document.getElementById('brightness').onchange = function () {
            change_setting("brightness", this.value)
        }

        document.getElementById('backlight_brightness').onchange = function () {
            change_setting("backlight_brightness", this.value)
        }

        document.getElementById('skipped_notes').onchange = function () {
            change_setting("skipped_notes", this.value)
        }

        document.getElementById('led_count').onchange = function () {
            change_setting("led_count", this.value)
        }

        document.getElementById('shift').onchange = function () {
            change_setting("shift", this.value)
        }

        document.getElementById('reverse').onchange = function () {
            change_setting("reverse", this.value)
        }


        document.getElementById('sides_color_mode').onchange = function () {
            change_setting("sides_color_mode", this.value)
            if (this.value == "RGB") {
                document.getElementById('sides_color_choose').hidden = false;
            } else {
                document.getElementById('sides_color_choose').hidden = true;
            }
        }
    }

    document.getElementById('fading_speed').onchange = function () {
        change_setting("fading_speed", this.value, false, true)
    }

    document.getElementById('velocity_speed').onchange = function () {
        change_setting("velocity_speed", this.value, false, true)
    }

    document.getElementById('light_mode').onchange = function () {
        if (this.value == "Fading") {
            document.getElementById('fading').hidden = false;
            document.getElementById('fading_speed').onchange();
        } else {
            document.getElementById('fading').hidden = true;
        }
        if (this.value == "Velocity") {
            document.getElementById('velocity').hidden = false;
            document.getElementById('velocity_speed').onchange();
        } else {
            document.getElementById('velocity').hidden = true;
        }
        change_setting("light_mode", this.value, false, true)
    }

    document.getElementById('ledcolors').addEventListener('change', function (event) {
        change_color_input('', 'led_color', 'led_color')
    });

    document.getElementById('speedslowcolors').addEventListener('change', function (event) {
        change_color_input('speed_slowest_', 'speed_slow_color', 'speed_slowest_color')
    });

    document.getElementById('speedfastcolors').addEventListener('change', function (event) {
        change_color_input('speed_fastest_', 'speed_fast_color', 'speed_fastest_color')
    });

    document.getElementById('gradientstartcolors').addEventListener('change', function (event) {
        change_color_input('gradient_start_', 'gradient_start_color', 'gradient_start_color')
    });

    document.getElementById('gradientendcolors').addEventListener('change', function (event) {
        change_color_input('gradient_end_', 'gradient_end_color', 'gradient_end_color')
    });

    document.getElementById('keyinscalecolors').addEventListener('change', function (event) {
        change_color_input('key_in_scale_', 'key_in_scale_color', 'key_in_scale_color')
    });

    document.getElementById('keynotinscalecolors').addEventListener('change', function (event) {
        change_color_input('key_not_in_scale_', 'key_not_in_scale_color', 'key_not_in_scale_color')
    });

    document.getElementById('rainbow_offset').onchange = function () {
        change_setting("rainbow_offset", this.value, false, true)
    }

    document.getElementById('rainbow_scale').onchange = function () {
        change_setting("rainbow_scale", this.value, false, true)
    }

    document.getElementById('rainbow_timeshift').onchange = function () {
        change_setting("rainbow_timeshift", this.value, false, true)
    }

    document.getElementById('color_mode').onchange = function () {
        switch (this.value) {
            case "Single":
                remove_color_modes();
                document.getElementById('Single').hidden = false;
                change_setting("color_mode", "Single", false, true);
                document.getElementById("led_color").dispatchEvent(new Event('input'));
                break;
            case "Multicolor":
                remove_color_modes();
                document.getElementById('Multicolor').hidden = false;
                change_setting("color_mode", "Multicolor", false, true);
                break;
            case "Rainbow":
                remove_color_modes();
                document.getElementById('Rainbow').hidden = false;
                change_setting("color_mode", "Rainbow", false, true);
                break;
            case "Speed":
                remove_color_modes();
                document.getElementById('Speed').hidden = false;
                change_setting("color_mode", "Speed", false, true);
                document.getElementById("speed_slow_color").dispatchEvent(new Event('input'));
                document.getElementById("speed_fast_color").dispatchEvent(new Event('input'));
                break;
            case "Gradient":
                remove_color_modes();
                document.getElementById('Gradient').hidden = false;
                change_setting("color_mode", "Gradient", false, true);
                document.getElementById("gradient_start_color").dispatchEvent(new Event('input'));
                document.getElementById("gradient_end_color").dispatchEvent(new Event('input'));
                break;
            case "Scale":
                remove_color_modes();
                document.getElementById('Scale').hidden = false;
                change_setting("color_mode", "Scale", false, true);
                document.getElementById("key_in_scale_color").dispatchEvent(new Event('input'));
                document.getElementById("key_not_in_scale_color").dispatchEvent(new Event('input'));
                break;
            default:

        }
    }
    get_settings();
}

function press_button(element) {
    element.classList.add("pressed");
    setTimeout(function () {
        element.classList.remove("pressed");
    }, 150);
}

function initialize_songs() {
    get_recording_status();
    if (getCookie("sort_by") !== null) {
        document.getElementById("sort_by").value = getCookie("sort_by");
    } else {
        document.getElementById("sort_by").value = "dateAsc";
    }
    get_songs();
    initialize_upload();
    window.addEventListener('resize', function (event) {
        var note_width = document.getElementById('player_and_songs').offsetWidth / 54;
        document.getElementById('myVisualizer').config.whiteNoteWidth = note_width;
    }, true);
}


function initialize_sequences() {
    clearInterval(homepage_interval);
    document.getElementById('next_step_button').addEventListener("mousedown", function (e) {
        press_button(document.getElementById('next_step_button'));
    });

    window.addEventListener('keydown', function (e) {
        if (e.keyCode == 32 && e.target == document.body) {
            change_setting('next_step', '0');
            press_button(document.getElementById('next_step_button'));
            e.preventDefault();
        }
    });
    //get_sequences();
    get_current_sequence_setting();
}

function initialize_ports_settings() {
    get_ports()
    document.getElementById('switch_ports').onclick = function () {
        document.getElementById('switch_ports').disabled = true;
        document.getElementById('switch_ports_sidebar').disabled = true;
        switch_ports()
    }
    document.getElementById('active_input').onchange = function () {
        change_setting("input_port", this.value)
    }
    document.getElementById('secondary_input').onchange = function () {
        change_setting("secondary_input_port", this.value)
    }
    document.getElementById('playback_input').onchange = function () {
        change_setting("play_port", this.value)
    }
}


function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function enforceMinMax(el) {
    if (el.value != "") {
        if (parseInt(el.value) < parseInt(el.min)) {
            el.value = el.min;
        }
        if (parseInt(el.value) > parseInt(el.max)) {
            el.value = el.max;
        }
    }
}

function get_sequences() {
    if (!document.getElementById('sequences_list_1')) {
        return false;
    }

    var xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            sequence_editing_number = document.getElementById('sequences_list_2').value;

            var loop_length = 1;
            if (document.getElementById('sequence_edit').getAttribute("active") == 'true') {
                loop_length = 2;
            }
            for (s = 1; s <= loop_length; s++) {
                var sequences_list = document.getElementById('sequences_list_' + s);
                response = JSON.parse(this.responseText);
                removeOptions(document.getElementById('sequences_list_' + s));
                var i = 0;
                response.sequences_list.unshift("None");
                response.sequences_list.forEach(function (item, index) {
                    var opt = document.createElement('option');
                    opt.appendChild(document.createTextNode(item));
                    opt.value = i;
                    sequences_list.appendChild(opt);
                    i += 1
                })
                if (s == 1) {
                    sequences_list.value = response.sequence_number;
                } else {
                    sequences_list.value = sequence_editing_number;
                }

            }
            //get_steps_list();
        }
    };
    xhttp.open("GET", "/api/get_sequences", true);
    xhttp.send();
}

function toggle_edit_sequence() {
    if (document.getElementById('sequence_edit').getAttribute("active") == 'true') {
        document.getElementById('sequence_edit').setAttribute("active", false);
        document.getElementById('sequence_edit_block').classList.add("opacity-50");
        document.getElementById('sequence_edit_block').classList.add("pointer-events-none");
        document.getElementById('sequence_edit').classList.add("animate-pulse");
        document.getElementById('sequence_block').classList.remove("pointer-events-none");
        document.getElementById('sequences_list_2').value = 0;
    } else {
        document.getElementById('sequence_edit').setAttribute("active", true);
        document.getElementById('sequence_edit_block').classList.remove("opacity-50");
        document.getElementById('sequence_edit_block').classList.remove("pointer-events-none");
        document.getElementById('sequence_edit').classList.remove("animate-pulse");
        document.getElementById('sequence_block').classList.add("pointer-events-none");
        get_sequences();
    }
}

function get_steps_list() {
    var xhttp = new XMLHttpRequest();
    var sequence_element = document.getElementById('sequences_list_2');
    var sequence = sequence_element.value;

    current_step = document.getElementById('sequence_step').value;

    document.getElementById('sequence_name').value = sequence_element.options[sequence_element.selectedIndex].text;
    if (sequence == 0) {
        return false;
    }

    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            removeOptions(document.getElementById('sequence_step'));
            var sequences_list = document.getElementById('sequence_step');
            response = JSON.parse(this.responseText);
            var i = 0;
            response.steps_list.forEach(function (item, index) {
                var opt = document.createElement('option');
                opt.appendChild(document.createTextNode(item.replace('step_', 'Step ')));
                opt.value = i;
                sequences_list.appendChild(opt);
                i += 1
            });
            document.getElementById("control_number").value = response.control_number;
            document.getElementById("next_step").value = response.next_step;
            document.getElementById('sequence_step').value = current_step;
            set_step_properties(sequence_element.value,
                document.getElementById('sequence_step').value);
        }
    };
    xhttp.open("GET", "/api/get_steps_list?sequence=" + sequence, true);
    xhttp.send();
}

function set_step_properties(sequence, step) {
    sequence -= 1
    var xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            get_current_sequence_setting(true, true);
        }
    };
    xhttp.open("GET", "/api/set_step_properties?sequence=" + sequence + "&step=" + step, true);
    xhttp.send();
}

function get_ports() {
    var xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200 && document.getElementById('active_input') != null) {
            var active_input_select = document.getElementById('active_input');
            var secondary_input_select = document.getElementById('secondary_input');
            var playback_select = document.getElementById('playback_input');
            response = JSON.parse(this.responseText);
            var length = active_input_select.options.length;
            for (i = length - 1; i >= 0; i--) {
                active_input_select.options[i] = null;
                secondary_input_select.options[i] = null;
                playback_select.options[i] = null;
            }
            response.ports_list.forEach(function (item, index) {
                var opt = document.createElement('option');
                var opt2 = document.createElement('option');
                var opt3 = document.createElement('option');
                opt.appendChild(document.createTextNode(item));
                opt2.appendChild(document.createTextNode(item));
                opt3.appendChild(document.createTextNode(item));
                opt.value = item;
                opt2.value = item;
                opt3.value = item;
                active_input_select.appendChild(opt);
                secondary_input_select.appendChild(opt2);
                playback_select.appendChild(opt3);
            });
            active_input_select.value = response.input_port;
            secondary_input_select.value = response.secondary_input_port;
            playback_select.value = response.play_port;
            var connected_ports = response.connected_ports;
            connected_ports = connected_ports.replaceAll("\\n", "&#10;")
            connected_ports = connected_ports.replaceAll("\\t", "        ")
            connected_ports = connected_ports.replaceAll("b\"", "")
            document.getElementById('connect_all_textarea').innerHTML = connected_ports;
        }
    };
    xhttp.open("GET", "/api/get_ports", true);
    xhttp.send();
}

function get_recording_status() {
    var xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            response = JSON.parse(this.responseText);
            document.getElementById("input_port").innerHTML = response.input_port;
            document.getElementById("play_port").innerHTML = response.play_port;

            if (response.isrecording) {
                document.getElementById("recording_status").innerHTML = '<p class="animate-pulse text-red-400">recording</p>';
                document.getElementById("start_recording_button").classList.add('pointer-events-none', 'animate-pulse');
                document.getElementById("save_recording_button").classList.remove('pointer-events-none', 'opacity-50');
                document.getElementById("cancel_recording_button").classList.remove('pointer-events-none', 'opacity-50');
            } else {
                document.getElementById("recording_status").innerHTML = '<p>idle</p>';
                document.getElementById("start_recording_button").classList.remove('pointer-events-none', 'animate-pulse');
                document.getElementById("save_recording_button").classList.add('pointer-events-none', 'opacity-50');
                document.getElementById("cancel_recording_button").classList.add('pointer-events-none', 'opacity-50');
            }
            if (Object.keys(response.isplaying).length > 0) {
                document.getElementById("midi_player_wrapper").classList.remove("hidden");
                document.getElementById("start_midi_play").classList.add("hidden");
                document.getElementById("stop_midi_play").classList.remove("hidden");
            }
        }
    };
    xhttp.open("GET", "/api/get_recording_status", true);
    xhttp.send();
}

function get_songs() {
    if (document.getElementById("songs_page")) {
        page = parseInt(document.getElementById("songs_page").value);
        max_page = parseInt(document.getElementById("songs_page").max);
    } else {
        page = 1;
        max_page = 1;
    }
    if (max_page == 0) {
        max_page = 1;
    }
    if (page > max_page) {
        document.getElementById("songs_page").value = max_page;
        return false;
    }
    if (page < 1) {
        document.getElementById("songs_page").value = 1;
        return false;
    }
    document.getElementById("songs_list_table").classList.add("animate-pulse", "pointer-events-none");

    sortby = document.getElementById("sort_by").value;
    if (document.getElementById("songs_per_page")) {
        length = document.getElementById("songs_per_page").value;
    } else {
        length = 10;
    }

    search = document.getElementById("song_search").value;

    var xhttp = new XMLHttpRequest();
    xhttp.timeout = 5000;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            document.getElementById("songs_list_table").innerHTML = this.responseText;
            var dates = document.getElementsByClassName("song_date");
            for (var i = 0; i < dates.length; i++) {
                dates.item(i).innerHTML = new Date(dates.item(i).innerHTML * 1000).toISOString().slice(0, 19).replace('T', ' ');
            }
            var names = document.getElementsByClassName("song_name");
            for (var i = 0; i < names.length; i++) {
                names.item(i).value = names.item(i).value.replace('.mid', '');
            }
            document.getElementById("songs_list_table").classList.remove("animate-pulse", "pointer-events-none");

            document.getElementById("songs_per_page").value = length;

            if (sortby == "nameAsc") {
                document.getElementById("sort_icon_nameAsc").classList.remove("hidden");
                document.getElementById("sort_icon_nameDesc").classList.add("hidden");
                document.getElementById("sort_by_name").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_date").classList.remove("text-gray-800", "dark:text-gray-200");
            }
            if (sortby == "nameDesc") {
                document.getElementById("sort_icon_nameDesc").classList.remove("hidden");
                document.getElementById("sort_icon_nameAsc").classList.add("hidden");
                document.getElementById("sort_by_name").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_date").classList.remove("text-gray-800", "dark:text-gray-200");
            }

            if (sortby == "dateAsc") {
                document.getElementById("sort_icon_dateAsc").classList.remove("hidden");
                document.getElementById("sort_icon_dateDesc").classList.add("hidden");
                document.getElementById("sort_by_date").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_name").classList.remove("text-gray-800", "dark:text-gray-200");
            }
            if (sortby == "dateDesc") {
                document.getElementById("sort_icon_dateDesc").classList.remove("hidden");
                document.getElementById("sort_icon_dateAsc").classList.add("hidden");
                document.getElementById("sort_by_date").classList.add("text-gray-800", "dark:text-gray-200");
                document.getElementById("sort_by_name").classList.remove("text-gray-800", "dark:text-gray-200");
            }

        }
    };
    xhttp.open("GET", "/api/get_songs?page=" + page + "&length=" + length + "&sortby=" + sortby + "&search=" + search, true);
    xhttp.send();
}


function show_multicolors(colors, ranges) {
    try {
        colors = JSON.parse(colors);
        ranges = JSON.parse(ranges);
    } catch (e) {
    }

    multicolor_element = document.getElementById("Multicolor");
    var i = 0
    multicolor_element.innerHTML = "";
    var add_button = "<button onclick=\"this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')\" " +
        "id=\"multicolor_add\" class=\"w-full outline-none mb-2 bg-gray-100 dark:bg-gray-600 font-bold h-6 py-2 px-2 " +
        "rounded-2xl inline-flex items-center\">\n" +
        "   <svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-6 w-full justify-items-center text-green-400\" " +
        "fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
        "      <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 9v3m0 " +
        "0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z\"></path>\n" +
        "   </svg>\n" +
        "</button>\n" +
        "<button onclick=\"change_setting('add_multicolor', '0')\" id=\"multicolor_add\" " +
        "class=\"hidden w-full outline-none mb-2 bg-gray-100 dark:bg-gray-600 font-bold h-6 py-2 px-2 " +
        "rounded-2xl inline-flex items-center\">\n" +
        "<span class=\"w-full text-green-400\">Click to confirm</span></button>"
    multicolor_element.classList.remove("pointer-events-none", "opacity-50");
    multicolor_element.innerHTML += add_button;
    for (const element of colors) {

        var hex_color = rgbToHex(element[0], element[1], element[2]);

        var min = 20
        var max = 108

        var value_left = ranges[i][0];
        var value_right = ranges[i][1];

        var value_left_percent = (100 / (max - min)) * value_left - (100 / (max - min)) * min;
        var value_right_percent = (100 / (max - min)) * value_right - (100 / (max - min)) * min;

        var value_right_percent_reverse = 100 - value_right_percent;

        //append multicolor slider
        multicolor_element.innerHTML += '<div class="mb-2 bg-gray-100 dark:bg-gray-600" id="multicolor_' + i + '">' +
            '<label class="ml-2 inline block uppercase tracking-wide text-xs font-bold mt-2 text-gray-600 dark:text-gray-400">\n' +
            '                    Color ' + parseInt(i + 1) + '\n' +
            '                </label><div onclick=\'this.classList.add("hidden");' +
            'this.nextElementSibling.classList.remove("hidden")\' class="inline float-right text-red-400">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n' +
            '  <path stroke-linecap="round" stroke-linejoin="round" ' +
            'stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 ' +
            '4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />\n' +
            '</svg>' +
            '</div><div onclick=\'change_setting("remove_multicolor", "' + i + '");' +
            'document.getElementById("Multicolor").classList.add("pointer-events-none","opacity-50")\' ' +
            'class="hidden inline float-right text-red-400">Click to confirm</div>' +
            '<input id="multicolor_input_' + i + '" type="color" value="' + hex_color + '"\n' +
            '                        class="cursor-pointer px-2 pt-2 h-8 w-full bg-gray-100 dark:bg-gray-600" ' +
            'oninput=\'editLedColor(event, "multicolor_' + i + '_")\'' +
            'onchange=\'change_setting("multicolor", this.value, ' + i + ')\'>\n' +
            '                <div id="multicolors_' + i + '" class="justify-center flex" ' +
            'onchange=\'change_color_input_multicolor(event, "multicolor_' + i + '_", "multicolor_input_' + i + '", "multicolor", ' + i + ')\'>\n' +
            '                    <span class="w-1/12 h-6 px-2 bg-gray-100 dark:bg-gray-600 text-red-400">R:</span>\n' +
            '                    <input id="multicolor_' + i + '_red" type="number" value="' + element[0] + '" min="0" max="255"\n' +
            '                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>\n' +
            '                    <span class="w-1/12 h-6 px-2 bg-gray-100 dark:bg-gray-600 text-green-400">G:</span>\n' +
            '                    <input id="multicolor_' + i + '_green" type="number" value="' + element[1] + '" min="0" max="255"\n' +
            '                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>\n' +
            '                    <span class="w-1/12 h-6 px-2 bg-gray-100 dark:bg-gray-600 text-blue-400">B:</span>\n' +
            '                    <input id="multicolor_' + i + '_blue" type="number" value="' + element[2] + '" min="0" max="255"\n' +
            '                           class="w-2/12 h-6 bg-gray-100 dark:bg-gray-600" onkeyup=enforceMinMax(this)>\n' +
            '                </div>' +
            '<div slider id="slider-distance">\n' +
            '  <div>\n' +
            '    <div inverse-left style="width:' + value_left_percent + '%;"></div>\n' +
            '    <div inverse-right style="width:' + value_right_percent_reverse + '%;"></div>\n' +
            '    <div range style="left:' + value_left_percent + '%;right:' + value_right_percent_reverse + '%;"></div>\n' +
            '    <span thumb style="left:' + value_left_percent + '%;"></span>\n' +
            '    <span thumb style="left:' + value_right_percent + '%;"></span>\n' +
            '    <div sign style="left:' + value_left_percent + '%;">\n' +
            '      <span id="value">' + value_left + '</span>\n' +
            '    </div>\n' +
            '    <div sign style="left:' + value_right_percent + '%;">\n' +
            '      <span id="value">' + value_right + '</span>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '  <input type="range" tabindex="0" value="' + value_left + '" max="' + max + '" min="' + min + '" ' +
            'step="1" oninput="show_left_slider(this)" ' +
            'onchange=\'change_setting("multicolor_range_left", this.value, ' + i + ')\' />\n' +
            '  <input type="range" tabindex="0" value="' + value_right + '" max="' + max + '" min="' + min + '" ' +
            'step="1" oninput="show_right_slider(this)" ' +
            'onchange=\'change_setting("multicolor_range_right", this.value, ' + i + ')\' />\n' +
            '</div>' +
            '               </div>';
        i++;
    }
    if (i >= 3) {
        multicolor_element.innerHTML += add_button;
    }
}

function show_left_slider(element) {
    element.value = Math.min(element.value, element.parentNode.childNodes[5].value);
    var value = (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.value) - (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.min);
    var children = element.parentNode.childNodes[1].childNodes;
    children[1].style.width = value + '%';
    children[5].style.left = value + '%';
    children[7].style.left = value + '%';
    children[11].style.left = value + '%';
    children[11].childNodes[1].innerHTML = element.value;
}

function show_right_slider(element) {
    element.value = Math.max(element.value, element.parentNode.childNodes[3].value);
    var value = (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.value) - (100 / (parseInt(element.max) - parseInt(element.min))) * parseInt(element.min);
    var children = element.parentNode.childNodes[1].childNodes;
    children[3].style.width = (100 - value) + '%';
    children[5].style.right = (100 - value) + '%';
    children[9].style.left = value + '%';
    children[13].style.left = value + '%';
    children[13].childNodes[1].innerHTML = element.value;
}

function change_color_input(prefix, color_input_id, setting_name) {
    var new_color = rgbToHex(
        parseInt(document.getElementById(prefix + "red").value, 10),
        parseInt(document.getElementById(prefix + "green").value, 10),
        parseInt(document.getElementById(prefix + "blue").value, 10));
    document.getElementById(color_input_id).value = new_color;
    change_setting(setting_name, new_color)
}

function change_color_input_multicolor(event, prefix, id_to_change, setting_name, i) {
    var new_color = rgbToHex(
        parseInt(document.getElementById(prefix + "red").value, 10),
        parseInt(document.getElementById(prefix + "green").value, 10),
        parseInt(document.getElementById(prefix + "blue").value, 10));
    document.getElementById(id_to_change).value = new_color;
    change_setting(setting_name, new_color, i)
}

var editLedColor = function (event, prefix) {
    document.getElementById(prefix + "red").value = hexToRgb(event.srcElement.value).r;
    document.getElementById(prefix + "green").value = hexToRgb(event.srcElement.value).g;
    document.getElementById(prefix + "blue").value = hexToRgb(event.srcElement.value).b;
};

function temporary_disable_button(element, timeout) {
    element.classList.add('pointer-events-none', 'animate-pulse');
    setTimeout(function () {
        element.classList.add('hidden');
        element.previousElementSibling.classList.remove('hidden');
        element.classList.remove('pointer-events-none', 'animate-pulse');
    }, timeout);
}

function formatBytes(bytes, decimals = 2, suffix = true) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (suffix == true) {
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    } else {
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    }
}

function animateValue(obj, start, end, duration, format = false) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        if (format) {
            obj.innerHTML = formatBytes(Math.floor(progress * (end - start) + start));
        } else {
            obj.innerHTML = Math.floor(progress * (end - start) + start);
        }
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function AdjustingInterval(workFunc, interval, errorFunc) {
    var that = this;
    var expected, timeout;
    this.interval = interval;

    this.start = function () {
        workFunc();
        expected = Date.now() + this.interval;
        timeout = setTimeout(step, this.interval);
    }

    this.stop = function () {
        clearTimeout(timeout);
    }

    function step() {
        var drift = Date.now() - expected;
        if (drift > that.interval) {
            // You could have some default stuff here too...
            if (errorFunc) errorFunc();
        }
        workFunc();
        expected += that.interval;
        timeout = setTimeout(step, Math.max(0, that.interval - drift));
    }
}

function initialize_upload() {

// Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.getElementById("drop-area").addEventListener(eventName, preventDefaults, false)
        document.body.addEventListener(eventName, preventDefaults, false)
    })

    let uploadProgress = []
    document.getElementById("drop-area").addEventListener('drop', handleDrop, false)
}

function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
}

function initializeProgress(numFiles) {
    document.getElementById("progress-bar").style.width = "0%";
    uploadProgress = []
    for (let i = numFiles; i > 0; i--) {
        uploadProgress.push(0)
    }
}

function updateProgress(fileNumber, percent) {
    uploadProgress[fileNumber] = percent
    let total = uploadProgress.reduce((tot, curr) => tot + curr, 0) / uploadProgress.length
    document.getElementById("progress-bar").style.width = total + "%";
    if (total >= 100 || total <= 0) {
        document.getElementById("progress-bar-group").classList.add("hidden");
    } else {
        document.getElementById("progress-bar-group").classList.remove("hidden");
    }
}

function handleDrop(e) {
    var dt = e.dataTransfer
    var files = dt.files

    handleFiles(files)
}

function handleFiles(files) {
    document.getElementById("gallery").innerHTML = "";
    files = [...files]
    initializeProgress(files.length)
    files.forEach(uploadFile)
    files.forEach(previewFile)
}

function previewFile(file) {
    let reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onloadend = function () {
        var name = document.createElement('div');
        name.setAttribute("id", file.name);
        name.innerHTML = file.name;
        name.className = "flex";
        document.getElementById('gallery').appendChild(name);
    }
}

function uploadFile(file, i) {
    var url = '/upload'
    var xhr = new XMLHttpRequest()
    var formData = new FormData()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')

    // Update progress (can be used to show progress indicator)
    xhr.upload.addEventListener("progress", function (e) {
        updateProgress(i, (e.loaded * 100.0 / e.total) || 100)
    })

    xhr.addEventListener('readystatechange', function (e) {
        if (xhr.readyState == 4 && xhr.status == 200) {
            response = JSON.parse(this.responseText);

            updateProgress(i, 100);

            if (response.success == true) {
                clearTimeout(get_songs_timeout);
                get_songs_timeout = setTimeout(function () {
                    get_songs();
                }, 2000);
                document.getElementById(response.song_name).innerHTML += "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-6 w-6 ml-2 text-green-400\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                    "  <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n" +
                    "</svg>";
            } else {
                document.getElementById(response.song_name).innerHTML += "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"h-6 w-6 ml-2 text-red-500\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n" +
                    "  <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\" />\n" +
                    "</svg>" + "<div class='text-red-400'>" + response.error + "</div>";
            }
        }
    })
    formData.append('file', file)
    xhr.send(formData)
}

function removeOptions(selectElement) {
    var i, L = selectElement.options.length - 1;
    for (i = L; i >= 0; i--) {
        selectElement.remove(i);
    }
}

function remove_color_modes() {
    var slides = document.getElementsByClassName("color_mode");
    for (var i = 0; i < slides.length; i++) {
        slides.item(i).hidden = true;
    }
}

//"waterfall" visualizer only updates the view when new note is played, this function makes the container scroll slowly
//to simulate smooth animation
function pageScroll() {
    document.getElementsByClassName("waterfall-notes-container")[0].scrollBy(0, -1);
    scrolldelay = setTimeout(pageScroll, 33);
}
