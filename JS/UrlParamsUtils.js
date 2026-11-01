function readURLParam(name) {
    const url = new URL(window.location);
    return url.searchParams.get(name);
}

function removeURLParam(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url);
}

function setURLParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
}
