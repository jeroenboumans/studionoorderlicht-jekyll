---
layout: post
title:  "State Listener for Home Assistant"
date:   2021-03-26 16:37:10 +0100
permalink: /blog/:slug
excerpt_separator: <!--more-->
---

As I started using [Home Assistant](https://www.home-assistant.io/){:target="_blank" rel="noopener"} (HA) I wanted to explore the options of outputting HA states to physical devices, like a matrix display. <!--more-->
Below I’ll guide you through a simple setup of how to build a states logger using the HA Websocket API. You can use these states in your own project to display the values on physical devices like I did on a [Pimoroni Micro Dot pHAT](https://shop.pimoroni.com/products/microdot-phat?variant=25454635527){:target="_blank" rel="noopener"}. I’m running all the commands bellow on a Raspberry Pi Zero W environment.

## Requirements

### Home Assistant

First you need to make sure a HA instance is running. You can run HA on a Raspberry Pi by following the installation guide for Raspberry [here](https://www.home-assistant.io/installation/raspberrypi){:target="_blank" rel="noopener"}.

Off-topic tip: *since the amount of states values HA is writing to the database can become quite large in the future I’d suggest saving these [somewhere else](https://www.home-assistant.io/integrations/recorder){:target="_blank" rel="noopener"} than the default database file on the SD card. This will lengthen the lifespan of your SD card.* 😉 *I’m saving the records to a MySQL database running on my Synology NAS but you can pick any other environment, like [Amazon RDS](https://aws.amazon.com/rds/){:target="_blank" rel="noopener"}, [Google Cloud SQL](https://cloud.google.com/sql){:target="_blank" rel="noopener"} etc.*

### Python Environment

You also need an environment that can run a Python. For starting and experimenting I’d suggest installing JetBrains’s [PyCharm Community edition](https://www.jetbrains.com/pycharm/download/){:target="_blank" rel="noopener"}. You can easily run python scripts on different Python versions and install packages required for your Python scripts. In my example I am using a Raspberry Pi Zero running Raspberry Pi OS Lite installed using the [Raspberry Pi Imager](https://www.raspberrypi.org/software/){:target="_blank" rel="noopener"}. That being said it’s time to install the first dependencies needed for this guide.

```bash
pip install asyncio asyncws
```

`asyncio` is used for running async processes in your python script while `asyncws` is used for listening to websockets, which is exactly what we need for listening to the [HA Websocket API](https://developers.home-assistant.io/docs/api/websocket){:target="_blank" rel="noopener"}. Our script will have the following simple structure:

1. **Logger**: logging the specified states to our terminal/display, each for a specified interval, like 2 seconds.
2. **Listener**: its goals are storing the state values, received by the HA Websocket API, into in a simple dictionary object (cache). Since we don’t know when HA updates the states we’re listening to this needs to be done on a different thread.

### HA Authorization Token
Go to the [profile section](https://my.home-assistant.io/redirect/profile/){:target="_blank" rel="noopener"} in HA and create a token in the bottom Token section. Copy it somewhere (safe). We’ll need it in our configuration named as `HASS_IO_AUTHORIZATION_TOKEN`.

---

## Creating the Logger

First make sure the specified states you want the listener listen to. Since I’m using a smart meter I’m listening to the power and gas states. Also define the host, token and port (if different than default) variables.

```python
#!/usr/bin/env python

import time
import asyncws
import asyncio
import threading
import json

token = HASS_IO_AUTHORIZATION_TOKEN # fill in your token
host = HASS_IO_HOSTNAME_OR_URL      # fill in your Home Assistant IP-address or domain

port = 8123
cache = {}
entities = [
    "sensor.power_tariff",
    "sensor.power_consumption_watt",
    "sensor.gas_consumption"
    ... 
]
```

### Adding the listener

```python
async def initSocket():
    websocket = await asyncws.connect('ws://{}:{}/api/websocket'.format(host, port))

    await websocket.send(json.dumps({'type': 'auth','access_token': token}))
    await websocket.send(json.dumps({'id': 1, 'type': 'subscribe_events', 'event_type': 'state_changed'}))
    
    print("Start socket...")

    while True:
        message = await websocket.recv()
        if message is None:
            break
        
        try:   
            data = json.loads(message)['event']['data']
            entity_id = data['entity_id']
            
            if entity_id in entities:
                
                print("writing {} to cache".format(entity_id))
                
                if 'unit_of_measurement' in data['new_state']['attributes']:
                    cache[entity_id] = "{} {}".format(data['new_state']['state'], data['new_state']['attributes']['unit_of_measurement'])
                else:
                    cache[entity_id] = data['new_state']['state']
                    
        except Exception:
            pass
```

Since the listener needs to run on a different thread/task we’re defining it as an async method. The `initSocket` method runs as long as the script is running. It reads every state that’s been submitted by the HA Websocket API. It then checks if the state is registered in our `entities` variable. If it is, it saves it to the `cache` variable.

### Adding the Logger

```python
async def initLogger():
    
    print("Start logger...")

    await asyncio.sleep(1) 
    
    while True:    
        if len(cache) == 0:
            await asyncio.sleep(2) 
            
        else:
            try:
                for key in cache:
                    # Do something here:
                    print(cache[key])

                    await asyncio.sleep(2) 
                
            except Exception:
               pass
```

The logger will also run on its own async thread. The logger has only one simple task: loop through all the available `cache` values and print them to the screen each for a given time of 2 seconds.

### Running the Processes Simultaneously

```python
...

async def main(): 
    listen = asyncio.create_task(initSocket()) 
    log = asyncio.create_task(initLogger()) 
    await listen
    await log

if __name__ == "__main__":    
    asyncio.run(main())
```

At the bottom of our script we initialize both processes in a `main` method and let `asyncio` run it asynchronous. Save your script and test it running the following command:

```bash
python logger.py
```

You can run it in the background by adding `&`

```bash
python log.py &
```

The logger starts showing cached state values whenever there are any in the `cache` variable. You should see something like the following:

![image](https://miro.medium.com/max/700/1*P9ngIsYkWvi2UHLqp7V1zQ.png)

---

If you’re interested in running it on a [Pimoroni Micro Dot pHAT](https://shop.pimoroni.com/products/microdot-phat?variant=25454635527){:target="_blank" rel="noopener"} like I did checkout the project on [Github](https://github.com/jeroenboumans/StateListener-HomeAssistant){:target="_blank" rel="noopener"}. If you have any questions feel free to ask!

