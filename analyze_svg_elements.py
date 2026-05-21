import xml.etree.ElementTree as ET
from collections import Counter

tree = ET.parse(r"D:\CS\University\FYP\Prototype\frontend\public\assets\dep. diagram\hey-check-the-main-part-of-the-building-and-then-r.svg")
root = tree.getroot()

tags = [elem.tag.split('}')[-1] for elem in root.iter()]
print("Element tags count:", Counter(tags))
